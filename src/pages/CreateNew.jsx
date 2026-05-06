import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BarChart3, Activity, BookMarked, Upload, Wifi, ArrowRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CARD_BASE = "relative cursor-pointer rounded-2xl border-2 p-6 flex flex-col gap-3 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]";
const CARD_ACTIVE = "border-primary bg-primary/5 shadow-md";
const CARD_IDLE = "border-border bg-card hover:border-primary/40";

function OptionCard({ icon: Icon, title, description, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className={`${CARD_BASE} ${CARD_IDLE} text-left w-full`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="font-semibold text-sm text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground absolute right-5 top-1/2 -translate-y-1/2" />
    </button>
  );
}

export default function CreateNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState("type"); // "type" | "source"

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BarChart3 className="w-[18px] h-[18px] text-primary" />
            </div>
            <span className="font-semibold text-sm text-foreground">Statistikkvisning</span>
          </div>
          <Link to="/saved">
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <BookMarked className="w-3.5 h-3.5" />
              Mine grafer
            </button>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">

            {step === "type" && (
              <motion.div
                key="type"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1">
                  <h1 className="text-xl font-bold text-foreground">Opprett statistikkvisning</h1>
                  <p className="text-sm text-muted-foreground">Hva slags visualisering ønsker du å lage?</p>
                </div>

                <div className="space-y-3">
                  <OptionCard
                    icon={BarChart3}
                    title="Graf"
                    description="Søyle-, linje-, kakediagram og mer. Fleksibel visualisering av data."
                    accent="bg-primary/10 text-primary"
                    onClick={() => setStep("source")}
                  />
                  <OptionCard
                    icon={Activity}
                    title="Barometer"
                    description="Sammenlign kommunen eller fylket mot nasjonalt gjennomsnitt."
                    accent="bg-emerald-500/10 text-emerald-600"
                    onClick={() => navigate("/barometer")}
                  />
                </div>
              </motion.div>
            )}

            {step === "source" && (
              <motion.div
                key="source"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <button
                    onClick={() => setStep("type")}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Tilbake
                  </button>
                  <h1 className="text-xl font-bold text-foreground">Velg datakilde</h1>
                  <p className="text-sm text-muted-foreground">Hvor skal dataene komme fra?</p>
                </div>

                <div className="space-y-3">
                  <OptionCard
                    icon={Upload}
                    title="Last opp fil"
                    description="CSV, Excel eller JSON fra din egen maskin."
                    accent="bg-primary/10 text-primary"
                    onClick={() => navigate("/chart?source=file")}
                  />
                  <OptionCard
                    icon={Wifi}
                    title="Hent fra API"
                    description="Helsedirektoratets kvalitetsindikatorer hentes automatisk."
                    accent="bg-violet-500/10 text-violet-600"
                    onClick={() => navigate("/chart?source=api")}
                  />
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}