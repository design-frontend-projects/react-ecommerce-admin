import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubscriptionPlanCard, SubscriptionPlan } from "./subscription-plan-card";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";

interface SubscriptionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const MOCK_PLANS: SubscriptionPlan[] = [
  {
    id: "pro_monthly",
    name: "Pro Hàng Tháng",
    description: "Dành cho quán ăn vừa và nhỏ",
    price: 199000,
    interval: "month",
    features: [
      "Quản lý tối đa 50 bàn",
      "Báo cáo doanh thu cơ bản",
      "Hỗ trợ qua email",
      "Tích hợp thanh toán QR"
    ]
  },
  {
    id: "premium_yearly",
    name: "Cao cấp Hàng Năm",
    description: "Giải pháp toàn diện cho chuỗi nhà hàng",
    price: 1990000,
    interval: "year",
    isPopular: true,
    features: [
      "Quản lý không giới hạn số bàn",
      "Báo cáo chuyên sâu & dự báo",
      "Hỗ trợ ưu tiên 24/7",
      "Tích hợp CRM & Marketing",
      "Tiết kiệm 20% so với gói tháng"
    ]
  }
];

export function SubscriptionModal({ isOpen, onOpenChange, onSuccess }: SubscriptionModalProps) {
  const [step, setStep] = useState<"choose" | "pay" | "success">("choose");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  };

  const handleNext = () => {
    if (step === "choose" && selectedPlan) {
      setStep("pay");
    }
  };

  const handleBack = () => {
    if (step === "pay") {
      setStep("choose");
    }
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    // Giả lập thanh toán
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setStep("success");
    
    // Auto close sau thành công
    setTimeout(() => {
      onOpenChange(false);
      onSuccess?.();
      // Reset khi mở lại
      setTimeout(() => {
        setStep("choose");
        setSelectedPlan(null);
      }, 500);
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] overflow-hidden">
        {step === "choose" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Bắt đầu dùng thử hoặc Chọn Gói</DialogTitle>
              <DialogDescription>
                Nâng cấp tài khoản của bạn để mở khóa toàn bộ tính năng quản lý nhà hàng chuyên nghiệp.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
              {MOCK_PLANS.map((plan) => (
                <SubscriptionPlanCard
                  key={plan.id}
                  plan={plan}
                  isSelected={selectedPlan?.id === plan.id}
                  onSelect={handlePlanSelect}
                />
              ))}
            </div>
            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <p className="text-sm text-muted-foreground mr-auto text-left">
                Bạn có thể hủy hoặc thay đổi gói bất cứ lúc nào.
              </p>
              <Button 
                onClick={handleNext} 
                disabled={!selectedPlan}
                className="w-full sm:w-auto mt-4 sm:mt-0"
              >
                Tiếp tục <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "pay" && selectedPlan && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Thanh toán</DialogTitle>
              <DialogDescription>
                Bạn đang chọn gói <strong>{selectedPlan.name}</strong> với giá{" "}
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(selectedPlan.price)}
                /{selectedPlan.interval === "month" ? "tháng" : "năm"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="bg-muted p-6 rounded-lg max-w-sm w-full">
                <h3 className="font-semibold text-lg mb-2">Thông tin thanh toán Demo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Đây là màn hình thanh toán giả lập. Trong ứng dụng thực tế, bước này sẽ tích hợp với VietQR, VNPay, Momo hoặc Stripe.
                </p>
                <div className="flex justify-between items-center bg-background border p-3 rounded text-sm mb-4 font-mono">
                  <span>Mã đơn:</span>
                  <span className="font-bold">SUB-{Math.floor(Math.random() * 100000)}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex sm:justify-between">
              <Button variant="outline" onClick={handleBack} disabled={isProcessing}>
                Quay lại
              </Button>
              <Button onClick={handlePayment} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận thanh toán
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "success" && (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in duration-300">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-2xl text-green-600">Thanh toán thành công!</DialogTitle>
            <DialogDescription className="text-base">
              Cảm ơn bạn đã đăng ký gói {selectedPlan?.name}.<br />
              Đang chuyển hướng...
            </DialogDescription>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
