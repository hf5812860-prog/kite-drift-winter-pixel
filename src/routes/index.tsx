import { createFileRoute } from "@tanstack/react-router";
import { WaslApp } from "@/components/wasl-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <WaslApp />;
}
