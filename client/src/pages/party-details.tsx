import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { 
  FileText, 
  Mail, 
  Phone, 
  MapPin, 
  Edit, 
  ChevronLeft,
  FileCog
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PartyForm } from "@/components/PartyForm";
import { InvoiceForm } from "@/components/InvoiceForm";
import { Party } from "@shared/schema";

export default function PartyDetailsPage() {
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [, params] = useRoute("/parties/:id");
  const partyId = params?.id;
  
  const { data: party } = useQuery<Party>({
    queryKey: [`/api/parties/${partyId}`],
  });
  
  if (!party) {
    return <div className="flex justify-center items-center h-64">Loading party details...</div>;
  }

  return (
    <>
      <div className="mb-6">
        <Link href="/parties">
          <Button variant="ghost" className="mb-4 hover:bg-neutral-100 -ml-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Parties
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">{party.name}</h1>
            <p className="text-neutral-600">{party.contactPerson}</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditFormOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Party
            </Button>
            <Button 
              onClick={() => setIsInvoiceFormOpen(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Phone className="h-5 w-5 text-neutral-500 mt-0.5" />
              <div>
                <p className="font-medium">{party.phone}</p>
                <p className="text-sm text-neutral-500">Phone</p>
              </div>
            </div>
            
            {party.email && (
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-neutral-500 mt-0.5" />
                <div>
                  <p className="font-medium">{party.email}</p>
                  <p className="text-sm text-neutral-500">Email</p>
                </div>
              </div>
            )}
            
            {party.address && (
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-neutral-500 mt-0.5" />
                <div>
                  <p className="font-medium">{party.address}</p>
                  <p className="text-sm text-neutral-500">Address</p>
                </div>
              </div>
            )}
            
            {party.gstin && (
              <div className="flex items-start space-x-3">
                <FileCog className="h-5 w-5 text-neutral-500 mt-0.5" />
                <div>
                  <p className="font-medium">{party.gstin}</p>
                  <p className="text-sm text-neutral-500">GSTIN</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>



        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {party.notes 
              ? <p className="text-neutral-700">{party.notes}</p>
              : <p className="text-neutral-500 italic">No notes added</p>
            }
          </CardContent>
        </Card>
      </div>



      <PartyForm
        open={isEditFormOpen}
        onOpenChange={setIsEditFormOpen}
        party={party}
      />
      
      <InvoiceForm
        open={isInvoiceFormOpen}
        onOpenChange={setIsInvoiceFormOpen}
      />
    </>
  );
}
