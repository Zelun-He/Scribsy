import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Note } from "@/types";
import { createSampleDocument } from "../sample-export";
import { isFinalized } from "../dashboard";

export async function demoNotePDF(note: Note): Promise<ArrayBuffer> {
  const soap = {
    subjective: note.soap_subjective || "",
    objective: note.soap_objective || "",
    assessment: note.soap_assessment || "",
    plan: note.soap_plan || "",
  };
  const doc = await createSampleDocument(soap, {
    title: `${note.patient_first_name || "Demo"} ${note.patient_last_name || "patient"}`,
    subtitle: `${isFinalized(note) ? "Finalized" : "Draft"} fictional note ${note.id} / ${note.note_type}`,
    plainText: Object.values(soap).some(Boolean) ? undefined : note.content,
    loadFont: async (filename) =>
      new Uint8Array(
        await readFile(join(process.cwd(), "public", "fonts", filename)),
      ),
  });
  return doc.output("arraybuffer");
}
