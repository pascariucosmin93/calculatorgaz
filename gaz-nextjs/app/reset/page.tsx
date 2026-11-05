import { Suspense } from "react";

import { Footer } from "../components/Footer";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="app-page">
      <div className="app-content">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
        <Footer />
      </div>
    </main>
  );
}
