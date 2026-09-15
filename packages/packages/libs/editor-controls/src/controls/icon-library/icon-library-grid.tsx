import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Box, Tooltip } from '@elementor/ui';
import { useVirtualizer } from '@tanstack/react-virtual';
import { __ } from '@wordpress/i18n';

import type { FontAwesome7Icon } from './font-awesome-7-catalog';
import { FontAwesomeGlyph } from './font-awesome-glyph';

export const ICON_LIBRARY_GRID_COLUMNS = 4;
export const ICON_LIBRARY_GRID_ROW_HEIGHT = 60;
export const ICON_LIBRARY_GRID_TOOLTIP_DELAY = 1000;
const ICON_LIBRARY_GRID_CELL_WIDTH = 53;
const ICON_LIBRARY_GRID_CELL_HEIGHT = 52;
const ICON_LIBRARY_GRID_GLYPH_SIZE = 20;
const ICON_LIBRARY_GRID_OVERSCAN = 3;

type IconLibraryGridProps = {
	items: FontAwesome7Icon[];
	selectedValue?: string;
	onSelect: ( id: string ) => void;
	onClose: () => void;
};

export const IconLibraryGrid = ( { items, selectedValue, onSelect, onClose }: IconLibraryGridProps ) => {
	const containerRef = useRef< HTMLDivElement >( null );
	const cellRefs = useRef( new Map< number, HTMLButtonElement >() );
	const shouldRestoreFocusRef = useRef( false );
	const selectedIndex = items.findIndex( ( item ) => item.id === selectedValue );
	const [ focusedIndex, setFocusedIndex ] = useState( selectedIndex >= 0 ? selectedIndex : 0 );
	const rowCount = Math.ceil( items.length / ICON_LIBRARY_GRID_COLUMNS );
	const virtualizer = useVirtualizer( {
		count: rowCount,
		getScrollElement: () => containerRef.current,
		estimateSize: () => ICON_LIBRARY_GRID_ROW_HEIGHT,
		overscan: ICON_LIBRARY_GRID_OVERSCAN,
	} );
	const virtualRows = virtualizer.getVirtualItems();

	useEffect( () => {
		if ( focusedIndex >= items.length ) {
			setFocusedIndex( selectedIndex >= 0 ? selectedIndex : 0 );
		}
	}, [ focusedIndex, items.length, selectedIndex ] );

	useEffect( () => {
		if ( selectedIndex >= 0 ) {
			virtualizer.scrollToIndex( Math.floor( selectedIndex / ICON_LIBRARY_GRID_COLUMNS ) );
		}
	}, [ selectedIndex, virtualizer ] );

	useEffect( () => {
		if ( ! shouldRestoreFocusRef.current ) {
			return;
		}

		const focusedCell = cellRefs.current.get( focusedIndex );

		if ( ! focusedCell ) {
			return;
		}

		focusedCell.focus();
		shouldRestoreFocusRef.current = false;
	}, [ focusedIndex, virtualRows ] );

	const handleSelect = ( id: string ) => {
		onSelect( id );
		onClose();
	};

	const handleKeyDown = ( event: React.KeyboardEvent< HTMLButtonElement >, index: number ) => {
		const nextIndex = getNextGridIndex( event.key, index, items.length, event.ctrlKey );

		if ( nextIndex === index ) {
			return;
		}

		event.preventDefault();
		shouldRestoreFocusRef.current = true;
		setFocusedIndex( nextIndex );
		virtualizer.scrollToIndex( Math.floor( nextIndex / ICON_LIBRARY_GRID_COLUMNS ) );
	};

	return (
		<Box
			ref={ containerRef }
			role="grid"
			aria-label={ __( 'Icons', 'elementor' ) }
			aria-colcount={ ICON_LIBRARY_GRID_COLUMNS }
			aria-rowcount={ rowCount }
			data-testid="icon-library-grid"
			sx={ { height: '100%', overflowY: 'auto' } }
		>
			<Box sx={ { height: virtualizer.getTotalSize(), position: 'relative' } }>
				{ virtualRows.map( ( virtualRow ) => {
					const rowStartIndex = virtualRow.index * ICON_LIBRARY_GRID_COLUMNS;
					const rowItems = items.slice( rowStartIndex, rowStartIndex + ICON_LIBRARY_GRID_COLUMNS );

					return (
						<Box
							key={ virtualRow.key }
							role="row"
							aria-rowindex={ virtualRow.index + 1 }
							sx={ {
								position: 'absolute',
								insetInlineStart: 0,
								insetBlockStart: 0,
								transform: `translateY(${ virtualRow.start }px)`,
								height: ICON_LIBRARY_GRID_ROW_HEIGHT,
								display: 'grid',
								gridTemplateColumns: `repeat(${ ICON_LIBRARY_GRID_COLUMNS }, ${ ICON_LIBRARY_GRID_CELL_WIDTH }px)`,
								gap: 1,
								px: 2,
								py: 0.5,
							} }
						>
							{ rowItems.map( ( icon, columnIndex ) => {
								const index = rowStartIndex + columnIndex;
								const isSelected = selectedValue === icon.id;

								return (
									<Tooltip
										key={ icon.id }
										title={ icon.label }
										placement="top"
										enterDelay={ ICON_LIBRARY_GRID_TOOLTIP_DELAY }
									>
										<Box
											ref={ ( element: HTMLButtonElement | null ) => {
												if ( element ) {
													cellRefs.current.set( index, element );
												} else {
													cellRefs.current.delete( index );
												}
											} }
											component="button"
											type="button"
											role="gridcell"
											aria-colindex={ columnIndex + 1 }
											aria-selected={ isSelected }
											aria-label={ icon.label }
											tabIndex={ focusedIndex === index ? 0 : -1 }
											onFocus={ () => setFocusedIndex( index ) }
											onClick={ () => handleSelect( icon.id ) }
											onKeyDown={ ( event: React.KeyboardEvent< HTMLButtonElement > ) =>
												handleKeyDown( event, index )
											}
											sx={ {
												width: ICON_LIBRARY_GRID_CELL_WIDTH,
												height: ICON_LIBRARY_GRID_CELL_HEIGHT,
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												p: 0,
												border: 0,
												borderRadius: 1,
												backgroundColor: isSelected ? 'action.selected' : 'transparent',
												color: 'text.tertiary',
												cursor: 'pointer',
												'&:hover, &:focus-visible': {
													backgroundColor: isSelected ? 'action.selected' : 'action.hover',
												},
											} }
										>
											<FontAwesomeGlyph
												icon={ icon }
												size={ ICON_LIBRARY_GRID_GLYPH_SIZE }
												color="currentColor"
											/>
										</Box>
									</Tooltip>
								);
							} ) }
						</Box>
					);
				} ) }
			</Box>
		</Box>
	);
};

const getNextGridIndex = ( key: string, currentIndex: number, itemCount: number, moveToGridBoundary: boolean ) => {
	const lastIndex = itemCount - 1;
	const rowStartIndex = Math.floor( currentIndex / ICON_LIBRARY_GRID_COLUMNS ) * ICON_LIBRARY_GRID_COLUMNS;
	const rowEndIndex = Math.min( rowStartIndex + ICON_LIBRARY_GRID_COLUMNS - 1, lastIndex );

	switch ( key ) {
		case 'ArrowRight':
			return Math.min( currentIndex + 1, lastIndex );
		case 'ArrowLeft':
			return Math.max( currentIndex - 1, 0 );
		case 'ArrowDown':
			return currentIndex + ICON_LIBRARY_GRID_COLUMNS <= lastIndex
				? currentIndex + ICON_LIBRARY_GRID_COLUMNS
				: currentIndex;
		case 'ArrowUp':
			return currentIndex - ICON_LIBRARY_GRID_COLUMNS >= 0
				? currentIndex - ICON_LIBRARY_GRID_COLUMNS
				: currentIndex;
		case 'Home':
			return moveToGridBoundary ? 0 : rowStartIndex;
		case 'End':
			return moveToGridBoundary ? lastIndex : rowEndIndex;
		default:
			return currentIndex;
	}
};
