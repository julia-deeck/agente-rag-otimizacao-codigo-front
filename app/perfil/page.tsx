import type { Metadata } from "next";
import AppFrame from "@/components/layout/AppFrame";
import ProfilePage from "@/components/auth/ProfilePage";

export const metadata: Metadata = {
  title: "Meu perfil | QuantumOne",
  description: "Gerencie seus dados pessoais e opções de acesso no QuantumOne.",
};

export default function Perfil() {
  return (
    <AppFrame activeItem="profile">
      <ProfilePage />
    </AppFrame>
  );
}
