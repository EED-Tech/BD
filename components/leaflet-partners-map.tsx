"use client"

import { MapContainer, TileLayer, GeoJSON } from "react-leaflet"
import { useMemo, useState, useEffect } from "react"
import type { PartnerRecord } from "@/lib/supabase-excel-reader"

interface LeafletPartnersMapProps {
  partners: PartnerRecord[]
}

export default function LeafletPartnersMap({ partners }: LeafletPartnersMapProps) {
  const [worldData, setWorldData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cssLoaded, setCssLoaded] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && !cssLoaded) {
      const existingLink = document.querySelector('link[href*="leaflet.css"]')
      if (!existingLink) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        link.crossOrigin = ""

        // Wait for CSS to load before proceeding
        link.onload = () => {
          setCssLoaded(true)
          // Small delay to ensure CSS is fully applied
          setTimeout(() => setMapReady(true), 100)
        }

        link.onerror = () => {
          console.error("Failed to load Leaflet CSS")
          // Still proceed but with potential styling issues
          setCssLoaded(true)
          setMapReady(true)
        }

        document.head.appendChild(link)
      } else {
        setCssLoaded(true)
        setMapReady(true)
      }
    }
  }, [cssLoaded])

  // Load world countries GeoJSON data
  useEffect(() => {
    const loadWorldData = async () => {
      try {
        // Using a simplified world countries dataset
        const response = await fetch("/world.geojson")
        const data = await response.json()
        setWorldData(data)
      } catch (error) {
        console.error("Failed to load world data:", error)
        // Fallback to a basic world outline
        setWorldData({
          type: "FeatureCollection",
          features: [],
        })
      } finally {
        setLoading(false)
      }
    }

    loadWorldData()
  }, [])

  useEffect(() => {
    return () => {
      // Cleanup any Leaflet instances on unmount
      const containers = document.querySelectorAll(".leaflet-container")
      containers.forEach((container) => {
        if ((container as any)._leaflet_id) {
          delete (container as any)._leaflet_id
        }
      })
    }
  }, [])

  // Group partners by country and calculate statistics
  const countryStats = useMemo(() => {
    const stats = partners.reduce(
      (acc, partner) => {
        if (partner.country) {
          const country = partner.country.trim()
          if (!acc[country]) {
            acc[country] = {
              total: 0,
              firms: 0,
              individuals: 0,
              sectors: new Set<string>(),
              expertise: new Set<string>(),
              partners: [],
              contacts: {
                emails: new Set<string>(),
                phones: new Set<string>(),
                websites: new Set<string>(),
              },
            }
          }

          acc[country].total++
          acc[country].partners.push(partner)

          if (partner.type === "firm") {
            acc[country].firms++
            // Collect firm contact info
            if (partner.email) acc[country].contacts.emails.add(partner.email)
            if (partner.phone) acc[country].contacts.phones.add(partner.phone)
            if (partner.website) acc[country].contacts.websites.add(partner.website)
          } else {
            acc[country].individuals++
            // Collect individual contact info
            if (partner.email) acc[country].contacts.emails.add(partner.email)
            if (partner.phone) acc[country].contacts.phones.add(partner.phone)
            if (partner.website) acc[country].contacts.websites.add(partner.website)
            if (partner.linkedIn) acc[country].contacts.websites.add(partner.linkedIn)
          }

          if (partner.sector) {
            acc[country].sectors.add(partner.sector)
          }

          if (partner.expertise) {
            partner.expertise.split(",").forEach((exp) => {
              acc[country].expertise.add(exp.trim())
            })
          }
        }
        return acc
      },
      {} as Record<
        string,
        {
          total: number
          firms: number
          individuals: number
          sectors: Set<string>
          expertise: Set<string>
          partners: PartnerRecord[]
          contacts: {
            emails: Set<string>
            phones: Set<string>
            websites: Set<string>
          }
        }
      >,
    )

    // Convert sets to arrays for easier handling
    return Object.entries(stats).map(([country, data]) => ({
      country,
      total: data.total,
      firms: data.firms,
      individuals: data.individuals,
      sectors: Array.from(data.sectors),
      expertise: Array.from(data.expertise),
      partners: data.partners,
      contacts: {
        emails: Array.from(data.contacts.emails),
        phones: Array.from(data.contacts.phones),
        websites: Array.from(data.contacts.websites),
      },
    }))
  }, [partners])

  const maxPartners = Math.max(...countryStats.map((c) => c.total), 1)

  // Create a map of country names to stats for quick lookup
  const countryStatsMap = useMemo(() => {
    return countryStats.reduce(
      (acc, stat) => {
        // Handle different country name variations
        const variations = [
          stat.country,
          stat.country.toLowerCase(),
          stat.country.toUpperCase(),
          // Add common country name mappings
          ...(stat.country === "United States" ? ["USA", "US", "United States of America"] : []),
          ...(stat.country === "United Kingdom" ? ["UK", "Britain", "Great Britain"] : []),
          ...(stat.country === "Germany" ? ["Deutschland"] : []),
        ]

        variations.forEach((variation) => {
          acc[variation] = stat
        })

        return acc
      },
      {} as Record<string, (typeof countryStats)[0]>,
    )
  }, [countryStats])

  // Style function for countries
  const getCountryStyle = (feature: any) => {
    const countryName = feature.properties.NAME || feature.properties.name || feature.properties.NAME_EN
    const stats =
      countryStatsMap[countryName] ||
      countryStatsMap[countryName?.toLowerCase()] ||
      countryStatsMap[countryName?.toUpperCase()]

    if (stats) {
      const intensity = stats.total / maxPartners
      const baseColor = stats.firms > stats.individuals ? "#3b82f6" : "#10b981"

      return {
        fillColor: baseColor,
        weight: 2,
        opacity: 1,
        color: "#ffffff",
        dashArray: "",
        fillOpacity: Math.max(0.3, intensity * 0.8),
      }
    }

    return {
      fillColor: "#f0f0f0",
      weight: 1,
      opacity: 0.5,
      color: "#cccccc",
      fillOpacity: 0.1,
    }
  }

  // Handle country interactions
  const onEachCountry = (feature: any, layer: any) => {
    const countryName = feature.properties.NAME || feature.properties.name || feature.properties.NAME_EN
    const stats =
      countryStatsMap[countryName] ||
      countryStatsMap[countryName?.toLowerCase()] ||
      countryStatsMap[countryName?.toUpperCase()]

    if (stats) {
      // Create enhanced popup content with contact information
      const popupContent = `
        <div style="min-width: 300px; max-width: 400px; font-family: system-ui, -apple-system, sans-serif;">
          <div style="font-weight: bold; font-size: 18px; color: #1e40af; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
            ${stats.country}
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
            <div style="text-align: center; padding: 12px; background: #dbeafe; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #1e40af;">${stats.total}</div>
              <div style="font-size: 12px; color: #374151;">Total Partners</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div style="text-align: center; padding: 8px; background: #dbeafe; border-radius: 6px;">
                <div style="font-size: 16px; font-weight: bold; color: #1e40af;">${stats.firms}</div>
                <div style="font-size: 10px; color: #374151;">Firms</div>
              </div>
              <div style="text-align: center; padding: 8px; background: #d1fae5; border-radius: 6px;">
                <div style="font-size: 16px; font-weight: bold; color: #059669;">${stats.individuals}</div>
                <div style="font-size: 10px; color: #374151;">Experts</div>
              </div>
            </div>
          </div>

          ${
            stats.sectors.length > 0
              ? `
            <div style="margin-bottom: 12px;">
              <div style="font-weight: 600; font-size: 13px; color: #374151; margin-bottom: 6px;">
                <span style="color: #7c3aed;">🏢</span> Top Sectors:
              </div>
              <div style="display: flex; flex-wrap: gap: 4px;">
                ${stats.sectors
                  .slice(0, 4)
                  .map(
                    (sector) =>
                      `<span style="background: #f3e8ff; color: #7c3aed; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">
                    ${sector}
                  </span>`,
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          ${
            stats.contacts.emails.length > 0 || stats.contacts.phones.length > 0 || stats.contacts.websites.length > 0
              ? `
            <div style="margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #3b82f6;">
              <div style="font-weight: 600; font-size: 13px; color: #374151; margin-bottom: 6px;">
                <span style="color: #3b82f6;">📞</span> Contact Information:
              </div>
              ${
                stats.contacts.emails.length > 0
                  ? `
                <div style="margin-bottom: 4px;">
                  <span style="font-size: 11px; color: #6b7280; font-weight: 500;">Emails:</span>
                  <div style="font-size: 11px; color: #374151;">
                    ${stats.contacts.emails
                      .slice(0, 3)
                      .map(
                        (email) =>
                          `<a href="mailto:${email}" style="color: #3b82f6; text-decoration: none;">${email}</a>`,
                      )
                      .join(", ")}
                    ${stats.contacts.emails.length > 3 ? ` +${stats.contacts.emails.length - 3} more` : ""}
                  </div>
                </div>
              `
                  : ""
              }
              ${
                stats.contacts.phones.length > 0
                  ? `
                <div style="margin-bottom: 4px;">
                  <span style="font-size: 11px; color: #6b7280; font-weight: 500;">Phones:</span>
                  <div style="font-size: 11px; color: #374151;">
                    ${stats.contacts.phones.slice(0, 2).join(", ")}
                    ${stats.contacts.phones.length > 2 ? ` +${stats.contacts.phones.length - 2} more` : ""}
                  </div>
                </div>
              `
                  : ""
              }
              ${
                stats.contacts.websites.length > 0
                  ? `
                <div>
                  <span style="font-size: 11px; color: #6b7280; font-weight: 500;">Websites:</span>
                  <div style="font-size: 11px; color: #374151;">
                    ${stats.contacts.websites
                      .slice(0, 2)
                      .map(
                        (website) =>
                          `<a href="${website.startsWith("http") ? website : "https://" + website}" target="_blank" style="color: #3b82f6; text-decoration: none;">${website}</a>`,
                      )
                      .join(", ")}
                    ${stats.contacts.websites.length > 2 ? ` +${stats.contacts.websites.length - 2} more` : ""}
                  </div>
                </div>
              `
                  : ""
              }
            </div>
          `
              : ""
          }

          <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 12px; color: #6b7280; font-weight: 500; margin-bottom: 4px;">
              <span style="color: #f59e0b;">⭐</span> Sample Partners:
            </div>
            <div style="font-size: 11px; color: #374151; line-height: 1.4;">
              ${stats.partners
                .slice(0, 4)
                .map((p) => {
                  const contactInfo = []
                  if (p.email) contactInfo.push(`📧 ${p.email}`)
                  if (p.phone) contactInfo.push(`📞 ${p.phone}`)
                  if (p.website) contactInfo.push(`🌐 ${p.website}`)
                  if (p.type === "individual" && p.linkedIn) contactInfo.push(`💼 LinkedIn`)

                  return `
                    <div style="margin-bottom: 6px; padding: 4px; background: white; border-radius: 4px; border: 1px solid #e5e7eb;">
                      <div style="font-weight: 500; color: #1f2937;">${p.name}</div>
                      ${p.title ? `<div style="font-size: 10px; color: #6b7280; font-style: italic;">${p.title}</div>` : ""}
                      ${contactInfo.length > 0 ? `<div style="font-size: 10px; color: #6b7280; margin-top: 2px;">${contactInfo.slice(0, 2).join(" • ")}</div>` : ""}
                    </div>
                  `
                })
                .join("")}
              ${stats.partners.length > 4 ? `<div style="font-size: 10px; color: #9ca3af; text-align: center; margin-top: 4px;">... and ${stats.partners.length - 4} more partners</div>` : ""}
            </div>
          </div>
        </div>
      `

      layer.bindPopup(popupContent, {
        maxWidth: 450,
        className: "custom-popup",
      })

      // Hover effects
      layer.on({
        mouseover: (e: any) => {
          const layer = e.target
          layer.setStyle({
            weight: 3,
            color: "#2563eb",
            dashArray: "",
            fillOpacity: 0.9,
          })
          layer.bringToFront()
        },
        mouseout: (e: any) => {
          const layer = e.target
          layer.setStyle(getCountryStyle(feature))
        },
      })
    } else {
      // Countries without partners
      layer.bindTooltip(`${countryName}<br/><small>No partners in this country</small>`, {
        sticky: true,
        className: "no-partners-tooltip",
      })
    }
  }

  if (loading || !cssLoaded || !mapReady) {
    return (
      <div className="h-[500px] w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6b7dd1] mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {!cssLoaded ? "Loading map styles..." : "Initializing world map..."}
          </p>
        </div>
      </div>
    )
  }

  if (!worldData || worldData.features.length === 0) {
    return (
      <div className="h-[500px] w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-lg">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Unable to load world map</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden mb-6 border border-gray-200 dark:border-gray-700 relative">
      <div style={{ height: "100%", width: "100%" }}>
        <MapContainer
          center={[20, 0]}
          zoom={2}
          scrollWheelZoom={true}
          className="h-full w-full"
          style={{ background: "#f8fafc", height: "500px", width: "100%" }}
          whenReady={() => {
            // Ensure map is fully ready
            console.log("[EED] Map container ready")
          }}
        >
          <TileLayer
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <GeoJSON data={worldData} style={getCountryStyle} onEachFeature={onEachCountry} />
        </MapContainer>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[1000] max-w-xs">
        <div className="text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">Partners by Country</div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-blue-500 rounded opacity-80"></div>
            <span className="text-gray-700 dark:text-gray-300">Firm-dominant countries</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-green-500 rounded opacity-80"></div>
            <span className="text-gray-700 dark:text-gray-300">Expert-dominant countries</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-gray-200 rounded opacity-60"></div>
            <span className="text-gray-700 dark:text-gray-300">No partners</span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <strong>Total:</strong> {partners.length} partners in {countryStats.length} countries
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Hover over a country for details.</div>
        </div>
      </div>
    </div>
  )
}
