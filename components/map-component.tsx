"use client"

import { useEffect, useRef, useState } from "react"

// Map tile layers
const MAP_LAYERS = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    name: "Standard",
  },
  light: {
    url: "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    name: "Light",
  },
  dark: {
    url: "https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    name: "Dark",
  },
}

export default function MapComponent({ geoData, isDarkMode = false }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [isClient, setIsClient] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  // Load Leaflet dynamically to avoid SSR issues
  useEffect(() => {
    setIsClient(true)

    const loadLeaflet = async () => {
      try {
        // Dynamically import Leaflet
        const L = await import("leaflet")

        if (typeof window !== "undefined") {
          const link = document.createElement("link")
          link.rel = "stylesheet"
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          link.crossOrigin = ""
          document.head.appendChild(link)
        }

        // Fix Leaflet icon issues
        delete L.default.Icon.Default.prototype._getIconUrl
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        })

        setLeafletLoaded(true)
        return L.default
      } catch (error) {
        console.error("Failed to load Leaflet:", error)
        setMapError(true)
        return null
      }
    }

    loadLeaflet()
  }, [])

  // Initialize map
  useEffect(() => {
    if (!isClient || !leafletLoaded || !geoData || geoData.length === 0 || mapError) return

    const initializeMap = async () => {
      try {
        const L = await import("leaflet")

        if (!mapInstanceRef.current && mapRef.current) {
          mapInstanceRef.current = L.default
            .map(mapRef.current, {
              preferCanvas: true,
              zoomControl: true,
            })
            .setView([0, 20], 3)

          // Add tile layer
          const tileLayer = L.default.tileLayer(isDarkMode ? MAP_LAYERS.dark.url : MAP_LAYERS.standard.url, {
            attribution: isDarkMode ? MAP_LAYERS.dark.attribution : MAP_LAYERS.standard.attribution,
            maxZoom: 18,
          })

          tileLayer.addTo(mapInstanceRef.current)

          // Add markers for each location
          geoData.forEach((location) => {
            if (location.value > 0 && location.lat && location.lng) {
              // Create circle marker with size based on value
              const circleColor = isDarkMode ? "#4B518C" : "#383e80"
              // Use sqrt scaling so large counts don't balloon out of proportion,
              // then cap at 120 km so no bubble overwhelms neighbouring countries.
              const maxValues = geoData.map((d) => d.value)
              const maxVal = Math.max(...maxValues, 1)
              const scaledRadius = Math.sqrt(location.value / maxVal) * 120000
              const circle = L.default
                .circle([location.lat, location.lng], {
                  color: circleColor,
                  fillColor: circleColor,
                  fillOpacity: 0.6,
                  radius: scaledRadius,
                })
                .addTo(mapInstanceRef.current)

              // Add popup with information
              const businessLines = location.businessLines ? location.businessLines.join(", ") : ""
              const popupContent = `
                <div style="color: #383e80; font-weight: bold; font-size: 14px;">${location.country}</div>
                <div style="margin-top: 5px;">Opportunities: ${location.value}</div>
                <div>Business Lines: ${businessLines}</div>
              `

              circle.bindPopup(popupContent)
              circle.on("mouseover", function (e) {
                this.openPopup()
              })
            }
          })

          // Fit bounds to markers if we have data
          const validPoints = geoData.filter((loc) => loc.value > 0 && loc.lat && loc.lng)
          if (validPoints.length > 0) {
            const bounds = L.default.latLngBounds(validPoints.map((loc) => [loc.lat, loc.lng]))
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })
          }
        }
      } catch (error) {
        console.error("Map initialization error:", error)
        setMapError(true)
      }
    }

    initializeMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [geoData, isClient, leafletLoaded, isDarkMode, mapError])

  if (!isClient) {
    return (
      <div className="h-full w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#383e80] mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing map...</p>
        </div>
      </div>
    )
  }

  if (mapError) {
    return (
      <div className="h-full w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 bg-[#383e80] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold">🗺️</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Map temporarily unavailable</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Geographic data shown in charts below</p>
        </div>
      </div>
    )
  }

  if (!leafletLoaded) {
    return (
      <div className="h-full w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse h-8 w-8 bg-[#383e80] rounded mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading map components...</p>
        </div>
      </div>
    )
  }

  return <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
}
