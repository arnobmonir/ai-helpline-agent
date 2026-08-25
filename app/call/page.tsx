import { redirect } from "next/navigation";

/** Softphone lives on `/` now. */
export default function CallPage() {
  redirect("/");
}
