import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ code }) {
  return (
    <div className="relative rounded-lg border border-border overflow-hidden bg-[hsl(222,47%,8%)] group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
      <pre className="text-[hsl(210,40%,85%)] p-3 text-[0.7rem] font-mono leading-relaxed overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

const BASIC_EXAMPLE = `library(jsonlite)

# Lag en data frame
df <- data.frame(
  År    = c(2020, 2021, 2022, 2023),
  Oslo  = c(85.2, 87.4, 89.1, 90.3),
  Bergen = c(78.6, 80.1, 82.4, 84.0)
)

# Eksporter til JSON
write_json(df, "graf_data.json", pretty = TRUE)`;

const TIDYVERSE_EXAMPLE = `library(tidyverse)
library(jsonlite)

df <- tibble(
  Kategori = c("A", "B", "C", "D"),
  Verdi    = c(42, 67, 31, 88),
  Gruppe   = c("Nord", "Sør", "Nord", "Sør")
)

write_json(df, "graf_data.json", pretty = TRUE)`;

const EXPECTED_OUTPUT = `[
  { "År": 2020, "Oslo": 85.2, "Bergen": 78.6 },
  { "År": 2021, "Oslo": 87.4, "Bergen": 80.1 },
  { "År": 2022, "Oslo": 89.1, "Bergen": 82.4 },
  { "År": 2023, "Oslo": 90.3, "Bergen": 84.0 }
]`;

const TIPS_CODE = `# Tips 1: Unngå NA-verdier (bruk NULL eller fjern dem)
df_clean <- df %>% filter(!is.na(Verdi))

# Tips 2: Sørg for at kolonnenavn ikke har mellomrom
names(df) <- gsub(" ", "_", names(df))

# Tips 3: Avrund desimaler ved behov
df$Verdi <- round(df$Verdi, 2)

write_json(df_clean, "graf_data.json", pretty = TRUE)`;

export default function JsonRGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div>
          <p className="text-xs font-semibold text-foreground">Veiledning: Eksporter data fra R til JSON</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Klikk for å vise steg-for-steg guide</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">

          {/* Step 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0">1</span>
              <p className="text-xs font-semibold text-foreground">Installer pakken <code className="font-mono bg-muted px-1 rounded">jsonlite</code></p>
            </div>
            <CodeBlock code={`install.packages("jsonlite")`} />
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0">2</span>
              <p className="text-xs font-semibold text-foreground">Grunnleggende eksempel</p>
            </div>
            <CodeBlock code={BASIC_EXAMPLE} />
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0">3</span>
              <p className="text-xs font-semibold text-foreground">Med tidyverse</p>
            </div>
            <CodeBlock code={TIDYVERSE_EXAMPLE} />
          </div>

          {/* Expected format */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Forventet JSON-format</p>
            <p className="text-[11px] text-muted-foreground">Filen skal inneholde et array av objekter (én rad = ett objekt):</p>
            <CodeBlock code={EXPECTED_OUTPUT} />
          </div>

          {/* Tips */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Nyttige tips</p>
            <CodeBlock code={TIPS_CODE} />
          </div>

          {/* Info box */}
          <div className="px-3 py-2 rounded-lg bg-accent/40 border border-accent text-[11px] text-accent-foreground space-y-1">
            <p className="font-semibold">Etter eksport:</p>
            <p>Last opp <code className="font-mono bg-foreground/10 px-1 rounded">.json</code>-filen direkte i "Fil"-fanen over. Appen støtter både enkle arrays og objekter med en <code className="font-mono bg-foreground/10 px-1 rounded">data</code>-nøkkel.</p>
          </div>
        </div>
      )}
    </div>
  );
}