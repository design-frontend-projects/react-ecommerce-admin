// ResPOS API Mutations - TanStack Query mutation hooks
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { generateOrderNumber } from '../lib/formatters'
import type {
  OrderItemStatus,
  OrderStatus,
  ResOrder,
  ResOrderItem,
  ReservationStatus,
  TableStatus,
  VoidRequestStatus,
} from '../types'
import { resposQueryKeys } from './queries'

// ============ Table Mutations ============

export function useUpdateTableStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tableId,
      status,
    }: {
      tableId: string
      status: TableStatus
    }) => {
      const { data, error } = await supabase
        .from('res_tables')
        .update({ status })
        .eq('id', tableId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.tables() })
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.dashboardStats,
      })
    },
  })
}

// ============ Shift Mutations ============

export function useOpenShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      employeeId,
      openingCash,
    }: {
      employeeId: string
      openingCash: number
    }) => {
      const { data, error } = await supabase
        .from('res_shifts')
        .insert({
          opened_by: employeeId,
          opening_cash: openingCash,
          status: 'open',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.activeShift })
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.shifts })
    },
  })
}

export function useCloseShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      shiftId,
      employeeId,
      closingCash,
      notes,
    }: {
      shiftId: string
      employeeId: string
      closingCash: number
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('res_shifts')
        .update({
          closed_by: employeeId,
          closing_cash: closingCash,
          status: 'closed',
          closed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', shiftId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.activeShift })
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.shifts })
    },
  })
}

// ============ Order Mutations ============

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tableId,
      shiftId,
      createdBy,
      customerName,
      items,
    }: {
      tableId?: string
      shiftId?: string
      createdBy?: string
      customerName?: string
      items: Array<{
        item_id: string
        variant_id?: string
        quantity: number
        unit_price: number
        properties?: unknown[]
        notes?: string
      }>
    }) => {
      // Create order
      const orderNumber = generateOrderNumber()
      const subtotal = items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
      )

      const { data: order, error: orderError } = await supabase
        .from('res_orders')
        .insert({
          order_number: orderNumber,
          table_id: tableId,
          shift_id: shiftId,
          created_by: createdBy,
          customer_name: customerName,
          status: 'open',
          subtotal,
          total_amount: subtotal,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        item_id: item.item_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        properties: item.properties || [],
        notes: item.notes,
      }))

      const { error: itemsError } = await supabase
        .from('res_order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Update table status
      if (tableId) {
        await supabase
          .from('res_tables')
          .update({ status: 'occupied' })
          .eq('id', tableId)
      }

      return order as ResOrder
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.orders() })
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.tables() })
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.dashboardStats,
      })
    },
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
      paymentMethod,
      tipAmount,
      discountAmount,
      discountType,
    }: {
      orderId: string
      status: OrderStatus
      paymentMethod?: string
      tipAmount?: number
      discountAmount?: number
      discountType?: string
    }) => {
      interface OrderUpdate {
        status: OrderStatus
        updated_at: string
        payment_method?: string
        tip_amount?: number
        discount_amount?: number
        discount_type?: string
        paid_at?: string
      }

      const updates: OrderUpdate = {
        status,
        updated_at: new Date().toISOString(),
      }

      if (paymentMethod) updates.payment_method = paymentMethod
      if (tipAmount !== undefined) updates.tip_amount = tipAmount
      if (discountAmount !== undefined) updates.discount_amount = discountAmount
      if (discountType) updates.discount_type = discountType
      if (status === 'paid') updates.paid_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('res_orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error
      return data as ResOrder
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.orders() })
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.order(data.id),
      })
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.dashboardStats,
      })
    },
  })
}

export function useAddOrderItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      itemId,
      variantId,
      quantity,
      unitPrice,
      properties,
      notes,
    }: {
      orderId: string
      itemId: string
      variantId?: string
      quantity: number
      unitPrice: number
      properties?: unknown[]
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('res_order_items')
        .insert({
          order_id: orderId,
          item_id: itemId,
          variant_id: variantId,
          quantity,
          unit_price: unitPrice,
          properties: properties || [],
          notes,
        })
        .select()
        .single()

      if (error) throw error

      // Recalculate order totals
      const { data: items } = await supabase
        .from('res_order_items')
        .select('unit_price, quantity')
        .eq('order_id', orderId)

      const subtotal =
        items?.reduce((sum, i) => sum + i.unit_price * i.quantity, 0) || 0

      await supabase
        .from('res_orders')
        .update({ subtotal, total_amount: subtotal })
        .eq('id', orderId)

      return data as ResOrderItem
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.order(variables.orderId),
      })
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.orders() })
    },
  })
}

export function useAddOrderItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      items,
    }: {
      orderId: string
      items: Array<{
        item_id: string
        variant_id?: string
        quantity: number
        unit_price: number
        properties?: unknown[]
        notes?: string
      }>
    }) => {
      const orderItems = items.map((item) => ({
        order_id: orderId,
        item_id: item.item_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        properties: item.properties || [],
        notes: item.notes,
      }))

      const { data, error } = await supabase
        .from('res_order_items')
        .insert(orderItems)
        .select()

      if (error) throw error

      // Recalculate order totals once
      const { data: allItems } = await supabase
        .from('res_order_items')
        .select('unit_price, quantity')
        .eq('order_id', orderId)

      const subtotal =
        allItems?.reduce((sum, i) => sum + i.unit_price * i.quantity, 0) || 0

      await supabase
        .from('res_orders')
        .update({ subtotal, total_amount: subtotal })
        .eq('id', orderId)

      return data as ResOrderItem[]
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.order(variables.orderId),
      })
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.orders() })
    },
  })
}

export function useUpdateOrderItemStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      status,
    }: {
      itemId: string
      status: OrderItemStatus
    }) => {
      const { data, error } = await supabase
        .from('res_order_items')
        .update({ status })
        .eq('id', itemId)
        .select()
        .single()

      if (error) throw error
      return data as ResOrderItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.orders() })
    },
  })
}

// ============ Void Request Mutations ============

export function useCreateVoidRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      requestedBy,
      reason,
      shiftAdminId,
    }: {
      orderId: string
      requestedBy: string
      reason: string
      shiftAdminId: string
    }) => {
      // Create void request
      const { data: request, error: requestError } = await supabase
        .from('res_void_requests')
        .insert({
          order_id: orderId,
          requested_by: requestedBy,
          reason,
        })
        .select()
        .single()

      if (requestError) throw requestError

      // Update order status
      await supabase
        .from('res_orders')
        .update({ status: 'void_pending' })
        .eq('id', orderId)

      // Create notification for shift admin
      await supabase.from('res_notifications').insert({
        recipient_id: shiftAdminId,
        type: 'void_request',
        title: 'Void Order Request',
        message: reason,
        data: { order_id: orderId, request_id: request.id },
      })

      return request
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.orders() })
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.voidRequests(),
      })
    },
  })
}

export function useProcessVoidRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      orderId,
      approvedBy,
      status,
      rejectionReason,
      requesterId,
    }: {
      requestId: string
      orderId: string
      approvedBy: string
      status: VoidRequestStatus
      rejectionReason?: string
      requesterId: string
    }) => {
      // Update void request
      const { data: request, error: requestError } = await supabase
        .from('res_void_requests')
        .update({
          approved_by: approvedBy,
          status,
          rejection_reason: rejectionReason,
          processed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single()

      if (requestError) throw requestError

      // Update order status
      const newOrderStatus = status === 'approved' ? 'void' : 'open'
      await supabase
        .from('res_orders')
        .update({ status: newOrderStatus })
        .eq('id', orderId)

      // If approved and table exists, free the table
      if (status === 'approved') {
        const { data: order } = await supabase
          .from('res_orders')
          .select('table_id')
          .eq('id', orderId)
          .single()

        if (order?.table_id) {
          await supabase
            .from('res_tables')
            .update({ status: 'dirty' })
            .eq('id', order.table_id)
        }
      }

      // Notify requester
      await supabase.from('res_notifications').insert({
        recipient_id: requesterId,
        type: status === 'approved' ? 'void_approved' : 'void_rejected',
        title:
          status === 'approved'
            ? 'Void Request Approved'
            : 'Void Request Rejected',
        message: rejectionReason || 'Your void request has been processed.',
        data: { order_id: orderId, request_id: requestId },
      })

      return request
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.orders() })
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.voidRequests(),
      })
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.tables() })
    },
  })
}

// ============ Notification Mutations ============

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('res_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.notifications(''),
      })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from('res_notifications')
        .update({ is_read: true })
        .eq('recipient_id', employeeId)
        .eq('is_read', false)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.notifications(''),
      })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('res_notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.notifications(''),
      })
    },
  })
}

// ============ Reservation Mutations ============

export function useCreateReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tableId,
      customerName,
      customerPhone,
      customerEmail,
      partySize,
      reservationDate,
      reservationTime,
      durationMinutes,
      notes,
      createdBy,
    }: {
      tableId?: string
      customerName: string
      customerPhone?: string
      customerEmail?: string
      partySize: number
      reservationDate: string
      reservationTime: string
      durationMinutes?: number
      notes?: string
      createdBy?: string
    }) => {
      const { data, error } = await supabase
        .from('res_reservations')
        .insert({
          table_id: tableId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          party_size: partySize,
          reservation_date: reservationDate,
          reservation_time: reservationTime,
          duration_minutes: durationMinutes || 90,
          notes,
          created_by: createdBy,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.reservations(),
      })
    },
  })
}

export function useUpdateReservationStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      reservationId,
      status,
    }: {
      reservationId: string
      status: ReservationStatus
    }) => {
      const { data, error } = await supabase
        .from('res_reservations')
        .update({ status })
        .eq('id', reservationId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.reservations(),
      })
    },
  })
}

// ============ Menu Mutations (Admin) ============

export function useCreateMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      categoryId,
      name,
      nameAr,
      description,
      descriptionAr,
      basePrice,
      imageUrl,
      preparationTime,
      allergens,
      tags,
    }: {
      categoryId?: string
      name: string
      nameAr?: string
      description?: string
      descriptionAr?: string
      basePrice: number
      imageUrl?: string
      preparationTime?: number
      allergens?: string[]
      tags?: string[]
    }) => {
      const { data, error } = await supabase
        .from('res_menu_items')
        .insert({
          category_id: categoryId,
          name,
          name_ar: nameAr,
          description,
          description_ar: descriptionAr,
          base_price: basePrice,
          image_url: imageUrl,
          preparation_time: preparationTime || 15,
          allergens: allergens || [],
          tags: tags || [],
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.menuItems() })
    },
  })
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      ...updates
    }: {
      itemId: string
      categoryId?: string
      name?: string
      nameAr?: string
      description?: string
      descriptionAr?: string
      basePrice?: number
      imageUrl?: string
      isAvailable?: boolean
      preparationTime?: number
      allergens?: string[]
      tags?: string[]
    }) => {
      const { data } = await supabase
        .from('res_menu_items')
        .update({
          category_id: updates.categoryId,
          name: updates.name,
          name_ar: updates.nameAr,
          description: updates.description,
          description_ar: updates.descriptionAr,
          base_price: updates.basePrice,
          image_url: updates.imageUrl,
          is_available: updates.isAvailable,
          preparation_time: updates.preparationTime,
          allergens: updates.allergens,
          tags: updates.tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select()
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.menuItem((data as any)?.id || ''),
      })
    },
  })
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('res_menu_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.menuItems() })
    },
  })
}

// ============ Menu Category Mutations ============

export function useCreateMenuCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      name,
      nameAr,
      icon,
      sortOrder,
      isActive,
    }: {
      name: string
      nameAr?: string
      icon?: string
      sortOrder?: number
      isActive?: boolean
    }) => {
      const { data, error } = await supabase
        .from('res_menu_categories')
        .insert({
          name,
          name_ar: nameAr,
          icon,
          sort_order: sortOrder ?? 0,
          is_active: isActive ?? true,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.menuCategories,
      })
    },
  })
}

export function useUpdateMenuCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      categoryId,
      name,
      nameAr,
      icon,
      sortOrder,
      isActive,
    }: {
      categoryId: string
      name?: string
      nameAr?: string
      icon?: string
      sortOrder?: number
      isActive?: boolean
    }) => {
      const { data, error } = await supabase
        .from('res_menu_categories')
        .update({
          name,
          name_ar: nameAr,
          icon,
          sort_order: sortOrder,
          is_active: isActive,
        })
        .eq('id', categoryId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.menuCategories,
      })
    },
  })
}

export function useDeleteMenuCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('res_menu_categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.menuCategories,
      })
    },
  })
}

// ============ Item Variant Mutations ============

export function useCreateItemVariant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      name,
      priceAdjustment,
      isDefault,
    }: {
      itemId: string
      name: string
      priceAdjustment?: number
      isDefault?: boolean
    }) => {
      const { data, error } = await supabase
        .from('res_item_variants')
        .insert({
          item_id: itemId,
          name,
          price_adjustment: priceAdjustment ?? 0,
          is_default: isDefault ?? false,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.menuItem(variables.itemId),
      })
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.menuItems() })
    },
  })
}

export function useUpdateItemVariant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      variantId,
      name,
      priceAdjustment,
      isDefault,
    }: {
      variantId: string
      name?: string
      priceAdjustment?: number
      isDefault?: boolean
    }) => {
      const { data, error } = await supabase
        .from('res_item_variants')
        .update({
          name,
          price_adjustment: priceAdjustment,
          is_default: isDefault,
        })
        .eq('id', variantId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.menuItems() })
    },
  })
}

export function useDeleteItemVariant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variantId: string) => {
      const { error } = await supabase
        .from('res_item_variants')
        .delete()
        .eq('id', variantId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.menuItems() })
    },
  })
}

// ============ Item Property Mutations ============

export function useCreateItemProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      name,
      options,
      isRequired,
      maxSelections,
    }: {
      itemId: string
      name: string
      options: Array<{ name: string; price: number }>
      isRequired?: boolean
      maxSelections?: number
    }) => {
      const { data, error } = await supabase
        .from('res_item_properties')
        .insert({
          item_id: itemId,
          name,
          options,
          is_required: isRequired ?? false,
          max_selections: maxSelections ?? 1,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: resposQueryKeys.menuItem(variables.itemId),
      })
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.menuItems() })
    },
  })
}

export function useUpdateItemProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      propertyId,
      name,
      options,
      isRequired,
      maxSelections,
    }: {
      propertyId: string
      name?: string
      options?: Array<{ name: string; price: number }>
      isRequired?: boolean
      maxSelections?: number
    }) => {
      const { data, error } = await supabase
        .from('res_item_properties')
        .update({
          name,
          options,
          is_required: isRequired,
          max_selections: maxSelections,
        })
        .eq('id', propertyId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.menuItems() })
    },
  })
}

export function useDeleteItemProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase
        .from('res_item_properties')
        .delete()
        .eq('id', propertyId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.menuItems() })
    },
  })
}

// ============ Floor Mutations ============

export function useCreateFloor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      name,
      description,
      sortOrder,
      isActive,
    }: {
      name: string
      description?: string
      sortOrder?: number
      isActive?: boolean
    }) => {
      const { data, error } = await supabase
        .from('res_floors')
        .insert({
          name,
          description,
          sort_order: sortOrder ?? 0,
          is_active: isActive ?? true,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.floors })
    },
  })
}

export function useUpdateFloor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      floorId,
      name,
      description,
      sortOrder,
      isActive,
    }: {
      floorId: string
      name?: string
      description?: string
      sortOrder?: number
      isActive?: boolean
    }) => {
      const { data, error } = await supabase
        .from('res_floors')
        .update({
          name,
          description,
          sort_order: sortOrder,
          is_active: isActive,
        })
        .eq('id', floorId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.floors })
    },
  })
}

export function useDeleteFloor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (floorId: string) => {
      const { error } = await supabase
        .from('res_floors')
        .delete()
        .eq('id', floorId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.floors })
    },
  })
}

// ============ Table CRUD Mutations ============

export function useCreateTable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      floorId,
      tableNumber,
      seats,
      positionX,
      positionY,
      shape,
      isActive,
    }: {
      floorId: string
      tableNumber: string
      seats?: number
      positionX?: number
      positionY?: number
      shape?: 'square' | 'round' | 'rectangle'
      isActive?: boolean
    }) => {
      const { data, error } = await supabase
        .from('res_tables')
        .insert({
          floor_id: floorId,
          table_number: tableNumber,
          seats: seats ?? 4,
          position_x: positionX ?? 0,
          position_y: positionY ?? 0,
          shape: shape ?? 'square',
          is_active: isActive ?? true,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.tables() })
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.floors })
    },
  })
}

export function useUpdateTable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tableId,
      floorId,
      tableNumber,
      seats,
      positionX,
      positionY,
      shape,
      isActive,
    }: {
      tableId: string
      floorId?: string
      tableNumber?: string
      seats?: number
      positionX?: number
      positionY?: number
      shape?: 'square' | 'round' | 'rectangle'
      isActive?: boolean
    }) => {
      const { data, error } = await supabase
        .from('res_tables')
        .update({
          floor_id: floorId,
          table_number: tableNumber,
          seats,
          position_x: positionX,
          position_y: positionY,
          shape,
          is_active: isActive,
        })
        .eq('id', tableId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.tables() })
    },
  })
}

export function useDeleteTable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tableId: string) => {
      const { error } = await supabase
        .from('res_tables')
        .delete()
        .eq('id', tableId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.tables() })
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.floors })
    },
  })
}

// ============ User/Employee Mutations ============

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      firstName,
      lastName,
      email,
      password,
      phone,
      pinCode,
      idNumber,
      roles,
    }: {
      firstName: string
      lastName: string
      email: string
      password?: string
      phone?: string
      pinCode?: string
      idNumber?: string
      roles: string[]
    }) => {
      let clerkUserId: string | null = null

      // 1. Create user in Clerk via Edge Function
      if (password) {
        const edgeFnUrl = `${SUPABASE_URL}/functions/v1/create-clerk-user`
        const response = await fetch(edgeFnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
          }),
        })

        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error || 'Failed to create Clerk user')
        }

        const clerkData = await response.json()
        clerkUserId = clerkData.clerkUserId as string
      } else {
        // Fallback simulated ID for when no password provided
        clerkUserId = `user_${crypto.randomUUID().split('-')[0]}`
      }

      // 2. Create public.users record
      const { error: userError } = await supabase.from('users').insert({
        clerk_user_id: clerkUserId,
        email,
        first_name: firstName,
        last_name: lastName,
        default_role: 'user',
        is_restuarant_user: true,
        is_active: true,
      })

      if (userError) {
        throw userError
      }

      // 3. Create res_employees record
      const { data: employee, error: empError } = await supabase
        .from('res_employees')
        .insert({
          user_id: clerkUserId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          pin_code: pinCode,
          id_number: idNumber,
          is_active: true,
        })
        .select()
        .single()

      if (empError) throw empError

      // 4. Assign Roles
      if (roles.length > 0) {
        const roleAssignments = roles.map((roleId) => ({
          employee_id: employee.id,
          role_id: roleId,
        }))

        const { error: roleError } = await supabase
          .from('res_employee_roles')
          .insert(roleAssignments)

        if (roleError) throw roleError
      }

      return employee
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.employees })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      firstName,
      lastName,
      email,
      phone,
      pinCode,
      idNumber,
      isActive,
      roles,
    }: {
      id: string
      firstName: string
      lastName: string
      email: string
      phone?: string
      pinCode?: string
      idNumber?: string
      isActive?: boolean
      roles: string[]
    }) => {
      // 1. Update res_employees
      const { data: employee, error: empError } = await supabase
        .from('res_employees')
        .update({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          pin_code: pinCode,
          id_number: idNumber,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (empError) throw empError

      // 2. Sync Roles (delete + insert)
      const { error: deleteError } = await supabase
        .from('res_employee_roles')
        .delete()
        .eq('employee_id', id)

      if (deleteError) throw deleteError

      if (roles.length > 0) {
        const roleAssignments = roles.map((roleId) => ({
          employee_id: id,
          role_id: roleId,
        }))

        const { error: insertError } = await supabase
          .from('res_employee_roles')
          .insert(roleAssignments)

        if (insertError) throw insertError
      }

      return employee
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.employees })
    },
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      employeeId,
      file,
    }: {
      employeeId: string
      file: File
    }) => {
      const fileExt = file.name.split('.').pop()
      const filePath = `employees/${employeeId}/avatar.${fileExt}`

      // Upload to avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath)

      // Update employee record
      const { data, error: updateError } = await supabase
        .from('res_employees')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeId)
        .select()
        .single()

      if (updateError) throw updateError
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.employees })
    },
  })
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      employeeId,
      avatarUrl,
    }: {
      employeeId: string
      avatarUrl: string
    }) => {
      // Extract file path from URL
      const url = new URL(avatarUrl)
      const pathMatch = url.pathname.match(/\/avatars\/(.+)$/)
      if (pathMatch) {
        await supabase.storage.from('avatars').remove([pathMatch[1]])
      }

      // Clear avatar_url in employee record
      const { data, error } = await supabase
        .from('res_employees')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.employees })
    },
  })
}

export function useToggleEmployeeStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      employeeId,
      isActive,
    }: {
      employeeId: string
      isActive: boolean
    }) => {
      const { data, error } = await supabase
        .from('res_employees')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resposQueryKeys.employees })
    },
  })
}
