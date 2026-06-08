"use client"

import { useState } from "react"
import PartnersMapComponent from "@/components/partners-map-component"
import DetailedPartnersTable from "@/components/detailed-partners-table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function PartnersPage() {
  const [activeTab, setActiveTab] = useState("map")

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="map">Partners Map</TabsTrigger>
          <TabsTrigger value="table">Detailed Partners Table</TabsTrigger>
        </TabsList>
        <TabsContent value="map">
          <PartnersMapComponent />
        </TabsContent>
        <TabsContent value="table">
          <DetailedPartnersTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
