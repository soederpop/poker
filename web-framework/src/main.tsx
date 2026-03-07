import { createRoot } from "react-dom/client"
import { ContainerProvider } from "@soederpop/luca/react"

import { App } from "./App"
import container from "./framework/container"

const rootNode = document.getElementById("root")

if (!rootNode) {
  throw new Error("Missing #root mount node")
}

createRoot(rootNode).render(
  <ContainerProvider container={container}>
    <App />
  </ContainerProvider>,
)
