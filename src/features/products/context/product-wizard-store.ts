import { create } from 'zustand'
import type { BaseProductFormData, VariantRowFormData } from '../data/product-wizard-schema'

interface ProductWizardState {
  isOpen: boolean
  currentStep: number
  isVariantsEnabled: boolean
  baseProductData: Partial<BaseProductFormData> | null
  variantsData: VariantRowFormData[]
  
  // Actions
  setIsOpen: (isOpen: boolean) => void
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setVariantsEnabled: (enabled: boolean) => void
  
  // Data actions
  setBaseProductData: (data: BaseProductFormData) => void
  setVariantsData: (data: VariantRowFormData[]) => void
  
  // Reset
  resetWizard: () => void
}

const initialState = {
  isOpen: false,
  currentStep: 1,
  isVariantsEnabled: true,
  baseProductData: null,
  variantsData: [],
}

export const useProductWizardStore = create<ProductWizardState>((set) => ({
  ...initialState,
  
  setIsOpen: (isOpen) => set({ isOpen }),
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 2) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
  setVariantsEnabled: (enabled) => set({ isVariantsEnabled: enabled }),
  
  setBaseProductData: (data) => set({ baseProductData: data }),
  setVariantsData: (data) => set({ variantsData: data }),
  
  resetWizard: () => set({ ...initialState }),
}))
