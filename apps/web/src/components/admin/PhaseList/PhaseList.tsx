"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Phase, PhaseType } from "@/types/phase";
import styles from "./PhaseList.module.scss";

const PHASE_TYPE_LABELS: Record<PhaseType, string> = {
  REGULAR_SEASON: "Temporada Regular",
  PLAYOFFS: "Playoffs",
  OTHER: "Otro",
};

interface SortablePhaseItemProps {
  phase: Phase;
  isSelected: boolean;
  onSelect: (phase: Phase) => void;
  onDelete: (phaseId: string) => void;
}

function SortablePhaseItem({
  phase,
  isSelected,
  onSelect,
  onDelete,
}: SortablePhaseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id });

  const itemStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={itemStyle}
      className={`${styles.item} ${isSelected ? styles.itemSelected : ""}`}
    >
      <button
        className={styles.dragHandle}
        type="button"
        aria-label="Arrastrar para reordenar"
        {...attributes}
        {...listeners}
      >
        <DragIcon />
      </button>

      <button
        type="button"
        className={styles.itemBody}
        onClick={() => onSelect(phase)}
        aria-pressed={isSelected}
      >
        <span className={styles.itemOrder}>{phase.order}</span>
        <span className={styles.itemName}>{phase.name}</span>
        <span className={styles.itemTypeBadge}>
          {PHASE_TYPE_LABELS[phase.type]}
        </span>
      </button>

      <button
        type="button"
        className={styles.deleteBtn}
        aria-label={`Eliminar fase ${phase.name}`}
        onClick={() => onDelete(phase.id)}
      >
        ×
      </button>
    </li>
  );
}

function DragIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="5" cy="4" r="1.5" fill="currentColor" />
      <circle cx="11" cy="4" r="1.5" fill="currentColor" />
      <circle cx="5" cy="8" r="1.5" fill="currentColor" />
      <circle cx="11" cy="8" r="1.5" fill="currentColor" />
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="11" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

interface PhaseListProps {
  phases: Phase[];
  selectedPhaseId?: string;
  onSelect: (phase: Phase) => void;
  onReorder: (reordered: Phase[]) => void;
  onDelete: (phaseId: string) => void;
}

export default function PhaseList({
  phases,
  selectedPhaseId,
  onSelect,
  onReorder,
  onDelete,
}: PhaseListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = phases.findIndex((p) => p.id === active.id);
    const newIndex = phases.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(phases, oldIndex, newIndex).map(
      (phase, index) => ({ ...phase, order: index + 1 }),
    );
    onReorder(reordered);
  }

  if (phases.length === 0) {
    return (
      <p className={styles.empty}>
        No hay fases creadas aún. Agrega la primera fase.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={phases.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className={styles.list}>
          {phases.map((phase) => (
            <SortablePhaseItem
              key={phase.id}
              phase={phase}
              isSelected={phase.id === selectedPhaseId}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
