import { mountPortal } from "./mount/mount-portal";
import "./styles.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("The mount target #root is missing");
}

void mountPortal(container);
