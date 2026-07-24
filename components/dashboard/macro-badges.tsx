import { Flame } from "lucide-react"

function MacroLetter({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`flex size-[15px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold leading-none text-white ${className}`}
      aria-hidden="true"
    >
      {label}
    </span>
  )
}

function CalorieFlame() {
  return <Flame className="size-4 shrink-0 fill-orange-400 text-orange-400" aria-hidden="true" />
}

// Shared macro icon (flame for calories, colored letter badge for macros).
export function MacroIcon({ macro }: { macro: "calories" | "protein" | "carbs" | "fat" }) {
  if (macro === "calories") return <CalorieFlame />
  const map = {
    protein: { label: "P", className: "bg-macro-protein" },
    carbs: { label: "C", className: "bg-macro-carbs" },
    fat: { label: "F", className: "bg-macro-fat" },
  } as const
  const { label, className } = map[macro]
  return <MacroLetter label={label} className={className} />
}

export function MacroBadges({
  kcal,
  kcalPct,
  protein,
  proteinPct,
  carbs,
  fat,
  variant = "inline",
  className = "",
}: {
  kcal: number
  kcalPct?: number | null
  protein: number
  proteinPct?: number | null
  carbs?: number | null
  fat?: number | null
  variant?: "inline" | "columns"
  className?: string
}) {
  // Fixed-width columns so numbers align vertically down a list of food rows.
  if (variant === "columns") {
    return (
      <div className={`flex items-center text-[13px] font-bold tabular-nums text-foreground ${className}`}>
        <span className={`flex items-center gap-1.5 ${kcalPct != null ? "w-[110px]" : "w-[84px]"}`}>
          <CalorieFlame />
          <span>
            {kcal}
            {kcalPct != null && <span className="font-normal text-faint"> ({kcalPct}%)</span>}
          </span>
          <span className="sr-only">kcal</span>
        </span>
        <span className={`flex items-center gap-1.5 ${proteinPct != null ? "w-[100px]" : "w-[78px]"}`}>
          <MacroLetter label="P" className="bg-macro-protein" />
          <span>
            {Math.round(protein)}
            {proteinPct != null && <span className="font-normal text-faint"> ({proteinPct}%)</span>}
          </span>
          <span className="sr-only">g protein</span>
        </span>
        {carbs != null && (
          <span className="flex w-[62px] items-center gap-1.5">
            <MacroLetter label="C" className="bg-macro-carbs" />
            <span>{Math.round(carbs)}</span>
            <span className="sr-only">g carbs</span>
          </span>
        )}
        {fat != null && (
          <span className="flex w-[62px] items-center gap-1.5">
            <MacroLetter label="F" className="bg-macro-fat" />
            <span>{Math.round(fat)}</span>
            <span className="sr-only">g fat</span>
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-bold tabular-nums text-foreground ${className}`}>
      <span className="flex items-center gap-1.5">
        <CalorieFlame />
        <span>
          {kcal}
          {kcalPct != null && <span className="font-normal text-faint"> ({kcalPct}%)</span>}
        </span>
        <span className="sr-only">kcal</span>
      </span>
      <span className="flex items-center gap-1.5">
        <MacroLetter label="P" className="bg-macro-protein" />
        <span>
          {Math.round(protein)}
          {proteinPct != null && <span className="font-normal text-faint"> ({proteinPct}%)</span>}
        </span>
        <span className="sr-only">g protein</span>
      </span>
      {carbs != null && (
        <span className="flex items-center gap-1.5">
          <MacroLetter label="C" className="bg-macro-carbs" />
          <span>{Math.round(carbs)}</span>
          <span className="sr-only">g carbs</span>
        </span>
      )}
      {fat != null && (
        <span className="flex items-center gap-1.5">
          <MacroLetter label="F" className="bg-macro-fat" />
          <span>{Math.round(fat)}</span>
          <span className="sr-only">g fat</span>
        </span>
      )}
    </div>
  )
}
