// Obsidian API extensions and custom types

// UI component props
export interface ViewComponentProps {
	onUpdate?: () => void;
	onError?: (error: Error) => void;
}
