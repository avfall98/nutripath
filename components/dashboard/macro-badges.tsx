import { Flame } from "lucide-react"

function MacroLetter({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${className}`}
      aria-hidden="true"
    >
      {label}
    </span>
  )
}

export function MacroBadges({
  kcal,
  kcalPct,
  protein,
  proteinPct,
  carbs,
  fat,
  className = "",
}: {
  kcal: number
  kcalPct?: number | null
  protein: number
  proteinPct?: number | null
  carbs?: number | null
  fat?: number | null
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold tabular-nums ${className}`}>
      <span className="flex items-center gap-1">
        <Flame className="size-4 shrink-0 fill-red-500 text-red-500" aria-hidden="true" />
        <span>
          {kcal}
          {kcalPct != null && <span className="font-normal text-muted-foreground"> ({kcalPct}%)</span>}
        </span>
        <span className="sr-only">kcal</span>
      </span>
      <span className="flex items-center gap-1">
        <MacroLetter label="P" className="bg-orange-500" />
        <span>
          {Math.round(protein)}
          {proteinPct != null && <span className="font-normal text-muted-foreground"> ({proteinPct}%)</span>}
        </span>
        <span className="sr-only">g protein</span>
      </span>
      {carbs != null && (
        <span className="flex items-center gap-1">
          <MacroLetter label="C" className="bg-sky-500" />
          <span>{Math.round(carbs)}</span>
          <span className="sr-only">g carbs</span>
        </span>
      )}
      {fat != null && (
        <span className="flex items-center gap-1">
          <MacroLetter label="F" className="bg-green-500" />
          <span>{Math.round(fat)}</span>
          <span className="sr-only">g fat</span>
        </span>
      )}
    </div>
  )
}
