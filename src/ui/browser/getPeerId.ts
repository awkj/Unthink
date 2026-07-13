import { LoroDoc } from "loro-crdt"

export async function getPeerId(): Promise<`${number}`> {
  const peerId: string | null = localStorage.getItem("peerId")
  if (peerId) {
    return peerId as `${number}`
  }
  const doc = new LoroDoc()
  localStorage.setItem("peerId", doc.peerIdStr)
  return doc.peerIdStr as `${number}`
}

export async function resetPeerId() {
  localStorage.removeItem("peerId")
}
