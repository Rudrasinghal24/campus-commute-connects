import { useStore } from "@/lib/store";
import type { Student } from "@/lib/store";

export function SeatGrid({
  routeId,
  highlightStudentId,
  onSelectSeat,
  selectableEmpty,
}: {
  routeId: string;
  highlightStudentId?: string;
  onSelectSeat?: (seatNo: string) => void;
  selectableEmpty?: boolean;
}) {
  const students = useStore((s) => s.students);
  const onRoute: Student[] = students.filter((s) => s.routeId === routeId);
  const seatMap = new Map(onRoute.map((s) => [s.seatNo, s]));
  const highlighted = students.find((s) => s.id === highlightStudentId);

  const rows = Array.from({ length: 10 }, (_, i) => i + 1);
  const cols: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];

  return (
    <div className="bg-muted/40 rounded-2xl p-4 sm:p-6 border border-border max-w-md mx-auto">
      <div className="flex justify-end mb-4 pb-4 border-b border-border">
        <div className="size-12 rounded-xl bg-secondary flex items-center justify-center text-[10px] font-bold uppercase text-muted-foreground">
          Driver
        </div>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex justify-end gap-2">
              {cols.slice(0, 2).map((c) => {
                const seat = `${row.toString().padStart(2, "0")}${c}`;
                const occupant = seatMap.get(seat);
                const isMine = highlighted?.seatNo === seat;
                return (
                  <SeatBox
                    key={seat}
                    seat={seat}
                    occupant={occupant}
                    isMine={isMine}
                    onSelect={onSelectSeat}
                    selectableEmpty={selectableEmpty}
                  />
                );
              })}
            </div>
            <div className="text-[9px] font-mono text-muted-foreground/50 px-1">{row.toString().padStart(2, "0")}</div>
            <div className="flex gap-2">
              {cols.slice(2).map((c) => {
                const seat = `${row.toString().padStart(2, "0")}${c}`;
                const occupant = seatMap.get(seat);
                const isMine = highlighted?.seatNo === seat;
                return (
                  <SeatBox
                    key={seat}
                    seat={seat}
                    occupant={occupant}
                    isMine={isMine}
                    onSelect={onSelectSeat}
                    selectableEmpty={selectableEmpty}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 justify-center text-[11px] font-medium mt-6 pt-4 border-t border-border">
        <Legend swatch="bg-card border border-border" label="Available" />
        <Legend swatch="bg-primary" label="Occupied" />
        <Legend swatch="bg-accent" label="Yours" />
      </div>
    </div>
  );
}

function SeatBox({
  seat,
  occupant,
  isMine,
  onSelect,
  selectableEmpty,
}: {
  seat: string;
  occupant?: Student;
  isMine?: boolean;
  onSelect?: (s: string) => void;
  selectableEmpty?: boolean;
}) {
  const base = "size-9 sm:size-10 rounded-lg flex items-center justify-center text-[9px] font-bold transition";
  if (isMine) {
    return <div className={`${base} bg-accent text-accent-foreground ring-2 ring-accent/30 ring-offset-2 ring-offset-background`}>{seat}</div>;
  }
  if (occupant) {
    return (
      <div className={`${base} bg-primary text-primary-foreground`} title={occupant.name}>
        {seat}
      </div>
    );
  }
  if (selectableEmpty && onSelect) {
    return (
      <button
        onClick={() => onSelect(seat)}
        className={`${base} bg-card border border-border text-muted-foreground hover:bg-accent/20 hover:border-accent`}
      >
        {seat}
      </button>
    );
  }
  return <div className={`${base} bg-card border border-border text-muted-foreground/40`}>{seat}</div>;
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`size-3 rounded-sm ${swatch}`} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
