import type { Metadata } from "next";
import RegistrationPage from "@/components/auth/RegistrationPage";

export const metadata: Metadata = {
  title: "Criar conta | QuantumOne",
  description: "Prepare seu perfil para explorar o QuantumOne.",
};

export default function Cadastro() {
  return <RegistrationPage />;
}
