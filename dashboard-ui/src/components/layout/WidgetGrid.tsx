import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { DENSITY_GAP } from '@/lib/constants';
import { useDashboardStore } from '@/store/dashboardStore';
import type { WidgetConfig, WidgetId } from '@/types';
import { BalanceWidget } from '@/components/widgets/BalanceWidget';
import { WinRateWidget } from '@/components/widgets/WinRateWidget';
import { TodayPnlWidget } from '@/components/widgets/TodayPnlWidget';
import { StreakWidget } from '@/components/widgets/StreakWidget';
import { ChartWidget } from '@/components/widgets/ChartWidget';
import { TradesWidget } from '@/components/widgets/TradesWidget';
import { IndicatorsWidget } from '@/components/widgets/IndicatorsWidget';
import { ControlsWidget } from '@/components/widgets/ControlsWidget';
import { AssistantWidget } from '@/components/widgets/AssistantWidget';
import type { BotStatus, Candle, Trade } from '@/types';

const WIDGET_MAP: Record<
  WidgetId,
  React.ComponentType<{ status: BotStatus | null; trades: Trade[]; candles: Candle[] }>
> = {
  balance: BalanceWidget,
  winRate: WinRateWidget,
  todayPnl: TodayPnlWidget,
  streak: StreakWidget,
  chart: ChartWidget,
  trades: TradesWidget,
  indicators: IndicatorsWidget,
  controls: ControlsWidget,
  assistant: AssistantWidget,
};

function SortableWidget({
  widget,
  status,
  trades,
  candles,
}: {
  widget: WidgetConfig;
  status: BotStatus | null;
  trades: Trade[];
  candles: Candle[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  });
  const Component = WIDGET_MAP[widget.id];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${widget.colSpan}`,
    gridRow: `span ${widget.rowSpan}`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx('min-h-0', isDragging && 'z-50 opacity-90')}
    >
      <motion.div
        className="group relative h-full"
        layout
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      >
        <button
          type="button"
          aria-label={`Drag ${widget.title}`}
          className="absolute right-3 top-3 z-20 flex h-7 w-7 cursor-grab items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-overlay)] text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <Component status={status} trades={trades} candles={candles} />
      </motion.div>
    </div>
  );
}

interface WidgetGridProps {
  status: BotStatus | null;
  trades: Trade[];
  candles: Candle[];
}

export function WidgetGrid({ status, trades, candles }: WidgetGridProps) {
  const widgets = useDashboardStore((s) => s.widgets);
  const setWidgets = useDashboardStore((s) => s.setWidgets);
  const density = useDashboardStore((s) => s.density);

  const visible = widgets.filter((w) => w.visible);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = widgets.findIndex((w) => w.id === active.id);
    const newIndex = widgets.findIndex((w) => w.id === over.id);
    const next = [...widgets];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    setWidgets(next);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={visible.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div
          className="grid h-full auto-rows-[minmax(120px,auto)] grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
          style={{ gap: DENSITY_GAP[density] }}
        >
          {visible.map((widget) => (
            <SortableWidget
              key={widget.id}
              widget={widget}
              status={status}
              trades={trades}
              candles={candles}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
