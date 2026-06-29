interface EmptyPlacesStateProps {
  isSearchMode: boolean;
  selectedCity?: string;
  cityIndexedCount: number | null;
  radius: string;
  className?: string;
}

function getMessage({
  isSearchMode,
  selectedCity,
  cityIndexedCount,
  radius,
}: Omit<EmptyPlacesStateProps, "className">) {
  if (isSearchMode) {
    return {
      title: "No places found",
      description: "Try a different search term or clear the search.",
    };
  }

  if (selectedCity && cityIndexedCount === 0) {
    return {
      title: `${selectedCity} hasn't been indexed yet`,
      description:
        "We don't have place data for this city in the database yet. Try Amsterdam or another city, or check back soon.",
    };
  }

  if (selectedCity && cityIndexedCount != null && cityIndexedCount > 0) {
    return {
      title: "No places found",
      description: `Nothing matched within ${radius} km. Try a larger radius or clear your filters.`,
    };
  }

  return {
    title: "No places found",
    description:
      "Try a different city, increase the radius, or check back later — place data may still be indexing.",
  };
}

export function EmptyPlacesState({
  className,
  ...props
}: EmptyPlacesStateProps) {
  const { title, description } = getMessage(props);

  return (
    <div
      className={
        className ??
        "rounded-xl border border-dashed border-frost-300 p-8 text-center"
      }
    >
      <p className="font-medium text-frost-800 dark:text-frost-100">{title}</p>
      <p className="mt-2 text-sm text-frost-600 dark:text-frost-400">
        {description}
      </p>
    </div>
  );
}
