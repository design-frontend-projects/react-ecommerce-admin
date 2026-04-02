import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { useProductWizardStore } from '../context/product-wizard-store'
import { variantRowSchema, type VariantRowFormData } from '../data/product-wizard-schema'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

const variantsFormSchema = z.object({
  variants: z.array(variantRowSchema).min(1, 'At least one variant is required'),
})

type VariantsFormValues = z.infer<typeof variantsFormSchema>

export function ProductVariantsForm({ onSubmit }: { onSubmit: (data: VariantRowFormData[]) => void }) {
  const { variantsData, baseProductData } = useProductWizardStore()

  const form = useForm<VariantsFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(variantsFormSchema) as any,
    defaultValues: {
      variants: variantsData.length > 0 ? variantsData : [{
        sku: baseProductData?.sku ? `${baseProductData.sku}-V1` : '',
        barcode: '',
        price: 0,
        cost_price: 0,
        stock_quantity: 0,
        min_stock: 0,
        weight: 0,
        dimensions: '',
        is_active: true,
        attributes_label: 'Default',
      }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variants',
  })

  const handleFormSubmit = (data: VariantsFormValues) => {
    onSubmit(data.variants)
  }

  return (
    <Form {...form}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form id="product-variants-form" onSubmit={form.handleSubmit(handleFormSubmit as any)} className="space-y-4 py-4">
        <div className="flex justify-between items-center pb-2">
          <h3 className="text-lg font-medium">Product Variants</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({
              sku: baseProductData?.sku ? `${baseProductData.sku}-V${fields.length + 1}` : '',
              barcode: '',
              price: 0,
              cost_price: 0,
              stock_quantity: 0,
              min_stock: 0,
              weight: 0,
              dimensions: '',
              is_active: true,
              attributes_label: `Variant ${fields.length + 1}`,
            })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Variant
          </Button>
        </div>

        {form.formState.errors.variants && (
          <div className="text-sm font-medium text-destructive">
            {form.formState.errors.variants.root?.message}
          </div>
        )}

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {fields.map((field, index) => (
            <Card key={field.id} className="relative">
              <CardContent className="pt-6 flex flex-col gap-4">
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}

                {/* --- Identity Row --- */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name={`variants.${index}.attributes_label`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label / Size</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Large, Red" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`variants.${index}.sku`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU *</FormLabel>
                        <FormControl>
                          <Input placeholder="Variant SKU" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`variants.${index}.barcode`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl>
                          <Input placeholder="UPC/EAN" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`variants.${index}.is_active`}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:mt-[22px] h-[40px]">
                        <div className="space-y-0.5">
                          <FormLabel className="text-xs">Active</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* --- Finance & Stock Row --- */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name={`variants.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price *</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" min="0" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`variants.${index}.cost_price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Price</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="any" 
                            min="0" 
                            placeholder="0.00" 
                            {...field} 
                            value={field.value ?? ''} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`variants.${index}.stock_quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Stock</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`variants.${index}.min_stock`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Stock Alert</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* --- Physical Row --- */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name={`variants.${index}.weight`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="any" 
                            min="0" 
                            placeholder="0.00" 
                            {...field} 
                            value={field.value ?? ''} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`variants.${index}.dimensions`}
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Dimensions (L x W x H)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 10x20x5 cm" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>

            </Card>
          ))}
        </div>
      </form>
    </Form>
  )
}
