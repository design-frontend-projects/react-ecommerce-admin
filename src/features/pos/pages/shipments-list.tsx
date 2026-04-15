import { useQuery } from '@tanstack/react-query'
import { getPosShipments } from '../data/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { Loader2, Truck, User, Phone, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ShipmentsList() {
  const { data: shipments, isLoading } = useQuery({
    queryKey: ['pos-shipments'],
    queryFn: getPosShipments,
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Truck className="h-8 w-8 text-primary" />
          Shipments
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!shipments || shipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No shipments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  shipments.map((shipment: any) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-mono text-xs">
                        {shipment.order_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center gap-1">
                            <User className="h-3 w-3" /> {shipment.recipient_name}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {shipment.recipient_phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col max-w-[200px]">
                          <span className="truncate text-sm flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {shipment.delivery_address}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {shipment.city}, {shipment.state} {shipment.postal_code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={shipment.status === 'pending' ? 'outline' : 'default'}>
                          {shipment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(shipment.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
