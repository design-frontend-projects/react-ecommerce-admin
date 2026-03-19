import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles } from "lucide-react";
import { SubscriptionModal } from "@/features/subscriptions/components/subscription-modal";

export const Route = createFileRoute("/subscription-required")({
  component: SubscriptionRequired,
});

function SubscriptionRequired() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(true);

  const handleSuccess = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 animate-pulse rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 animate-pulse rounded-full bg-violet-500/10 blur-3xl delay-1000" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-sky-500/5 blur-3xl delay-500" />
      </div>

      {/* Header with sign-out */}
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center gap-2 text-white/80">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Quản lý Nhà hàng</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/60 hover:text-white hover:bg-white/10"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Đăng xuất
        </Button>
      </header>

      {/* Center content — shown behind the modal */}
      <div className="relative z-0 text-center px-4">
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Chào mừng đến với Nền tảng Quản lý
        </h1>
        <p className="max-w-md mx-auto text-base text-white/50">
          Chọn gói phù hợp để mở khóa toàn bộ tính năng quản lý nhà hàng
          chuyên nghiệp.
        </p>
      </div>

      {/* Subscription modal — always open on this page */}
      <SubscriptionModal
        isOpen={modalOpen}
        onOpenChange={(open) => {
          // Prevent closing on this page — reopen immediately
          if (!open) {
            setModalOpen(true);
          }
        }}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
