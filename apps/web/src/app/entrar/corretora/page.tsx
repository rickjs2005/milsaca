import { redirect } from "next/navigation";

// A página /entrar/corretora era email + senha (legacy). Hoje todo mundo
// (produtor e corretora) usa o mesmo OTP em /entrar. Redirecionamos pra evitar
// confundir quem chegar por link antigo.
export default function EntrarCorretoraPage() {
  redirect("/entrar");
}
