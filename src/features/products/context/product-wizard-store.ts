import { create } from 'zustand'
import type {
  BaseProductFormData,
  VariantRowFormData,
} from '../data/schema'

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
  setBaseProductData: (data: Partial<BaseProductFormData>) => void
  setVariantsData: (data: VariantRowFormData[]) => void

  // Reset
  resetWizard: () => void
}

const initialState = {
  isOpen: false,
  currentStep: 1,
  isVariantsEnabled: false,
  baseProductData: null,
  variantsData: [],
}

export const useProductWizardStore = create<ProductWizardState>((set) => ({
  ...initialState,

  setIsOpen: (isOpen) => set({ isOpen }),
  setStep: (step) => set({ currentStep: step }),
  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, state.isVariantsEnabled ? 4 : 3),
    })),
  prevStep: () =>
    set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
  setVariantsEnabled: (enabled) =>
    set((state) => ({
      isVariantsEnabled: enabled,
      // If disabled and we are on step 4, pull back to step 3
      currentStep: !enabled && state.currentStep > 3 ? 3 : state.currentStep,
    })),

  setBaseProductData: (data) =>
    set((state) => ({
      baseProductData: state.baseProductData
        ? { ...state.baseProductData, ...data }
        : data,
    })),
  setVariantsData: (data) => set({ variantsData: data }),

  resetWizard: () => set({ ...initialState }),
}))
