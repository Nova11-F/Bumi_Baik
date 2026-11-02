import { getCurrentUser } from "@/lib/supabase/auth";
import { HeaderClient, type HeaderAccount } from "./HeaderClient";

export async function Header() {
  const { supabase, user } = await getCurrentUser();
  let account: HeaderAccount | null = null;

  if (user) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Profil untuk navigasi belum berhasil dimuat.", error);
    }

    const profileName =
      typeof profile?.full_name === "string" ? profile.full_name.trim() : "";
    const metadataName = user.user_metadata.full_name;
    const name: string =
      profileName ||
      (typeof metadataName === "string" ? metadataName.trim() : "") ||
      user.email ||
      "Akun";

    account = {
      name,
      initials: name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toLocaleUpperCase("id-ID") ?? "")
        .join(""),
      isAdmin: profile?.role === "admin",
    };
  }

  return <HeaderClient account={account} />;
}
