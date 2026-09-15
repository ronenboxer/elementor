import * as React from 'react';
import { ThemeProvider } from '@elementor/ui';
import { useVirtualizer } from '@tanstack/react-virtual';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ICON_LIBRARY_GRID_COLUMNS, ICON_LIBRARY_GRID_TOOLTIP_DELAY } from '../icon-library-grid';
import { ICON_LIBRARY_SEARCH_DEBOUNCE_DELAY, IconLibraryPopover } from '../icon-library-popover';
import { useFontAwesome7Catalog } from '../use-font-awesome-7-catalog';

jest.mock( '../use-font-awesome-7-catalog' );

const mockScrollToIndex = jest.fn();
let mockVisibleIndices: number[] | null = null;

jest.mock( '@tanstack/react-virtual', () => ( {
	useVirtualizer: jest.fn().mockImplementation( ( config ) => {
		const indices = mockVisibleIndices ?? Array.from( { length: config.count }, ( _, i ) => i );
		const itemSize = config.estimateSize();

		return {
			getVirtualItems: jest.fn().mockReturnValue(
				indices.map( ( index ) => ( {
					key: `item-${ index }`,
					index,
					start: index * itemSize,
					size: itemSize,
				} ) )
			),
			getTotalSize: jest.fn().mockReturnValue( config.count * itemSize ),
			scrollToIndex: mockScrollToIndex,
			getVirtualIndexes: jest.fn().mockReturnValue( indices ),
		};
	} ),
} ) );

describe( 'IconLibraryPopover', () => {
	const icons = [
		{
			id: 'fa-solid:star',
			name: 'star',
			label: 'star',
			library: 'fa-solid',
			value: 'fa-solid fa-star',
			aliases: [ 'favorite' ],
			width: 576,
			height: 512,
			paths: [ 'M0 0h100v100H0z' ],
		},
		{
			id: 'fa-regular:circle',
			name: 'circle',
			label: 'circle',
			library: 'fa-regular',
			value: 'fa-regular fa-circle',
			aliases: [],
			width: 512,
			height: 512,
			paths: [ 'M1 1h10v10H1z' ],
		},
		{
			id: 'fa-brands:github',
			name: 'github',
			label: 'github',
			library: 'fa-brands',
			value: 'fa-brands fa-github',
			aliases: [],
			width: 496,
			height: 512,
			paths: [ 'M2 2h10v10H2z' ],
		},
	];

	beforeEach( () => {
		jest.clearAllMocks();
		mockVisibleIndices = null;
		mockScrollToIndex.mockImplementation( ( index: number ) => {
			if ( mockVisibleIndices ) {
				mockVisibleIndices = [ index ];
			}
		} );
		sessionStorage.clear();
		jest.mocked( useFontAwesome7Catalog ).mockReturnValue( {
			data: icons,
			isLoading: false,
		} as never );
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	it( 'selects an icon and closes', () => {
		// Arrange.
		const onSelect = jest.fn();
		const onClose = jest.fn();

		render(
			<ThemeProvider>
				<IconLibraryPopover
					open
					selectedIconClass={ null }
					selectedIconLibrary={ null }
					onSelect={ onSelect }
					onClose={ onClose }
				/>
			</ThemeProvider>
		);

		// Act.
		fireEvent.click( screen.getByRole( 'gridcell', { name: /star/i } ) );

		// Assert.
		expect( onSelect ).toHaveBeenCalledWith( { value: 'fa-solid fa-star', library: 'fa-solid' } );
		expect( onClose ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'highlights the selected icon when the stored class uses an alias', () => {
		// Arrange.
		render(
			<ThemeProvider>
				<IconLibraryPopover
					open
					selectedIconClass="fa-solid fa-favorite"
					selectedIconLibrary="fa-solid"
					onSelect={ jest.fn() }
					onClose={ jest.fn() }
				/>
			</ThemeProvider>
		);

		// Assert.
		expect( screen.getByRole( 'gridcell', { name: /star/i } ) ).toHaveAttribute( 'aria-selected', 'true' );
	} );

	it( 'uses grid view by default and persists list view when reopened', async () => {
		// Arrange.
		const props = {
			open: true,
			selectedIconClass: null,
			selectedIconLibrary: null,
			onSelect: jest.fn(),
			onClose: jest.fn(),
		};
		const { unmount } = render(
			<ThemeProvider>
				<IconLibraryPopover { ...props } />
			</ThemeProvider>
		);

		// Assert.
		expect( screen.getByRole( 'grid', { name: 'Icons' } ) ).toBeInTheDocument();

		// Act.
		fireEvent.click( screen.getByRole( 'button', { name: 'Change view' } ) );
		fireEvent.click( screen.getByRole( 'menuitemradio', { name: 'List' } ) );

		// Assert.
		expect( screen.getByRole( 'listbox' ) ).toBeInTheDocument();

		// Act.
		unmount();
		render(
			<ThemeProvider>
				<IconLibraryPopover { ...props } />
			</ThemeProvider>
		);

		// Assert.
		expect( await screen.findByRole( 'listbox' ) ).toBeInTheDocument();
	} );

	it( 'preserves search, filter, and selection when switching views', () => {
		// Arrange.
		jest.useFakeTimers();
		render(
			<ThemeProvider>
				<IconLibraryPopover
					open
					selectedIconClass="fa-solid fa-star"
					selectedIconLibrary="fa-solid"
					onSelect={ jest.fn() }
					onClose={ jest.fn() }
				/>
			</ThemeProvider>
		);

		const search = screen.getByPlaceholderText( 'Search' );

		// Act.
		fireEvent.change( search, { target: { value: 'star' } } );
		act( () => {
			jest.advanceTimersByTime( ICON_LIBRARY_SEARCH_DEBOUNCE_DELAY );
		} );
		fireEvent.click( screen.getByRole( 'button', { name: 'Filter by library' } ) );
		fireEvent.click( screen.getByRole( 'menuitemcheckbox', { name: 'Font Awesome - Solid' } ) );
		fireEvent.keyDown( screen.getByRole( 'menu', { name: 'Filter by library' } ), { key: 'Escape' } );
		fireEvent.click( screen.getByRole( 'button', { name: 'Change view' } ) );
		fireEvent.click( screen.getByRole( 'menuitemradio', { name: 'List' } ) );

		// Assert.
		expect( search ).toHaveValue( 'star' );
		expect( screen.getByRole( 'button', { name: 'Filter by library, active' } ) ).toBeInTheDocument();
		expect( screen.getByRole( 'option', { name: /star/i } ) ).toHaveAttribute( 'aria-selected', 'true' );
	} );

	it( 'supports two-dimensional keyboard navigation in grid view', () => {
		// Arrange.
		const gridIcons = [
			...icons,
			...Array.from( { length: 3 }, ( _, index ) => ( {
				...icons[ 0 ],
				id: `fa-solid:grid-${ index + 3 }`,
				name: `grid-${ index + 3 }`,
				label: `grid-${ index + 3 }`,
				value: `fa-solid fa-grid-${ index + 3 }`,
			} ) ),
		];
		jest.mocked( useFontAwesome7Catalog ).mockReturnValue( {
			data: gridIcons,
			isLoading: false,
		} as never );
		render(
			<ThemeProvider>
				<IconLibraryPopover
					open
					selectedIconClass={ null }
					selectedIconLibrary={ null }
					onSelect={ jest.fn() }
					onClose={ jest.fn() }
				/>
			</ThemeProvider>
		);

		const star = screen.getByRole( 'gridcell', { name: 'star' } );
		const circle = screen.getByRole( 'gridcell', { name: 'circle' } );
		const gridFive = screen.getByRole( 'gridcell', { name: 'grid-5' } );

		// Act.
		act( () => star.focus() );
		fireEvent.keyDown( star, { key: 'ArrowRight' } );

		// Assert.
		expect( circle ).toHaveFocus();

		// Act.
		fireEvent.keyDown( circle, { key: 'ArrowDown' } );

		// Assert.
		expect( gridFive ).toHaveFocus();

		// Act.
		fireEvent.keyDown( gridFive, { key: 'Home' } );

		// Assert.
		expect( screen.getByRole( 'gridcell', { name: 'grid-4' } ) ).toHaveFocus();

		// Act.
		fireEvent.keyDown( screen.getByRole( 'gridcell', { name: 'grid-4' } ), { key: 'End' } );

		// Assert.
		expect( gridFive ).toHaveFocus();

		// Act.
		fireEvent.keyDown( gridFive, { key: 'ArrowDown' } );

		// Assert.
		expect( gridFive ).toHaveFocus();

		// Act.
		fireEvent.keyDown( gridFive, { key: 'Home', ctrlKey: true } );

		// Assert.
		expect( star ).toHaveFocus();

		// Act.
		fireEvent.keyDown( star, { key: 'End', ctrlKey: true } );

		// Assert.
		expect( gridFive ).toHaveFocus();

		// Act.
		const github = screen.getByRole( 'gridcell', { name: 'github' } );
		act( () => github.focus() );
		fireEvent.keyDown( github, { key: 'ArrowDown' } );

		// Assert.
		expect( github ).toHaveFocus();
	} );

	it( 'restores focus after keyboard navigation mounts an off-screen row', async () => {
		// Arrange.
		const iconCount = ICON_LIBRARY_GRID_COLUMNS * 3;
		const largeCatalog = Array.from( { length: iconCount }, ( _, index ) => ( {
			...icons[ 0 ],
			id: `fa-solid:icon-${ index }`,
			name: `icon-${ index }`,
			label: `icon-${ index }`,
			value: `fa-solid fa-icon-${ index }`,
		} ) );
		mockVisibleIndices = [ 0 ];
		jest.mocked( useFontAwesome7Catalog ).mockReturnValue( {
			data: largeCatalog,
			isLoading: false,
		} as never );
		render(
			<ThemeProvider>
				<IconLibraryPopover
					open
					selectedIconClass={ null }
					selectedIconLibrary={ null }
					onSelect={ jest.fn() }
					onClose={ jest.fn() }
				/>
			</ThemeProvider>
		);

		const firstIcon = screen.getByRole( 'gridcell', { name: 'icon-0' } );

		// Act.
		act( () => firstIcon.focus() );
		fireEvent.keyDown( firstIcon, { key: 'End', ctrlKey: true } );

		// Assert.
		expect( mockScrollToIndex ).toHaveBeenCalledWith( 2 );
		await waitFor( () => expect( screen.getByRole( 'gridcell', { name: 'icon-11' } ) ).toHaveFocus() );
	} );

	it( 'virtualizes grid rows and scrolls to the selected icon', () => {
		// Arrange.
		const iconCount = ICON_LIBRARY_GRID_COLUMNS * 2 + 1;
		const largeCatalog = Array.from( { length: iconCount }, ( _, index ) => ( {
			...icons[ 0 ],
			id: `fa-solid:icon-${ index }`,
			name: `icon-${ index }`,
			label: `icon-${ index }`,
			value: `fa-solid fa-icon-${ index }`,
		} ) );
		jest.mocked( useFontAwesome7Catalog ).mockReturnValue( {
			data: largeCatalog,
			isLoading: false,
		} as never );

		// Act.
		render(
			<ThemeProvider>
				<IconLibraryPopover
					open
					selectedIconClass={ `fa-solid fa-icon-${ iconCount - 1 }` }
					selectedIconLibrary="fa-solid"
					onSelect={ jest.fn() }
					onClose={ jest.fn() }
				/>
			</ThemeProvider>
		);

		// Assert.
		expect( jest.mocked( useVirtualizer ) ).toHaveBeenLastCalledWith(
			expect.objectContaining( { count: Math.ceil( iconCount / ICON_LIBRARY_GRID_COLUMNS ) } )
		);
		expect( mockScrollToIndex ).toHaveBeenCalledWith( 2 );
	} );

	it( 'delays icon-name tooltips in grid view', () => {
		// Arrange.
		jest.useFakeTimers();
		render(
			<ThemeProvider>
				<IconLibraryPopover
					open
					selectedIconClass={ null }
					selectedIconLibrary={ null }
					onSelect={ jest.fn() }
					onClose={ jest.fn() }
				/>
			</ThemeProvider>
		);

		// Act.
		fireEvent.mouseOver( screen.getByRole( 'gridcell', { name: 'star' } ) );
		act( () => {
			jest.advanceTimersByTime( ICON_LIBRARY_GRID_TOOLTIP_DELAY - 1 );
		} );

		// Assert.
		expect( screen.queryByRole( 'tooltip', { name: 'star' } ) ).not.toBeInTheDocument();

		// Act.
		act( () => {
			jest.advanceTimersByTime( 1 );
		} );

		// Assert.
		expect( screen.getByRole( 'tooltip', { name: 'star' } ) ).toBeInTheDocument();
	} );

	it( 'shows action tooltips without a delay', () => {
		// Arrange.
		jest.useFakeTimers();
		render(
			<ThemeProvider>
				<IconLibraryPopover
					open
					selectedIconClass={ null }
					selectedIconLibrary={ null }
					onSelect={ jest.fn() }
					onClose={ jest.fn() }
				/>
			</ThemeProvider>
		);

		// Act.
		fireEvent.mouseOver( screen.getByRole( 'button', { name: 'Filter by library' } ) );
		act( () => {
			jest.advanceTimersByTime( 0 );
		} );

		// Assert.
		expect( screen.getByRole( 'tooltip', { name: 'Filter by library' } ) ).toBeInTheDocument();

		// Act.
		fireEvent.mouseOut( screen.getByRole( 'button', { name: 'Filter by library' } ) );
		fireEvent.mouseOver( screen.getByRole( 'button', { name: 'Change view' } ) );
		act( () => {
			jest.advanceTimersByTime( 0 );
		} );

		// Assert.
		expect( screen.getByRole( 'tooltip', { name: 'Change view' } ) ).toBeInTheDocument();
	} );

	it( 'filters by library without clearing the search query', () => {
		// Arrange.
		jest.useFakeTimers();

		render(
			<ThemeProvider>
				<IconLibraryPopover
					open
					selectedIconClass={ null }
					selectedIconLibrary={ null }
					onSelect={ jest.fn() }
					onClose={ jest.fn() }
				/>
			</ThemeProvider>
		);

		const search = screen.getByPlaceholderText( 'Search' );

		// Act.
		fireEvent.change( search, { target: { value: 'star' } } );
		act( () => {
			jest.advanceTimersByTime( ICON_LIBRARY_SEARCH_DEBOUNCE_DELAY );
		} );
		fireEvent.click( screen.getByRole( 'button', { name: 'Filter by library' } ) );
		expect( screen.getByRole( 'menuitemcheckbox', { name: 'All icons' } ) ).toBeChecked();
		fireEvent.click( screen.getByRole( 'menuitemcheckbox', { name: 'Font Awesome - Regular' } ) );

		// Assert.
		expect( search ).toHaveValue( 'star' );
		expect( screen.getByRole( 'menuitemcheckbox', { name: 'Font Awesome - Regular' } ) ).toBeChecked();
		expect( screen.getByText( /Sorry, nothing matched/ ) ).toBeInTheDocument();

		// Act.
		fireEvent.click( screen.getByRole( 'menuitemcheckbox', { name: 'Font Awesome - Solid' } ) );
		fireEvent.keyDown( screen.getByRole( 'menu' ), { key: 'Escape' } );

		// Assert.
		expect( search ).toHaveValue( 'star' );
		expect( screen.getByRole( 'button', { name: 'Filter by library, active' } ) ).toBeInTheDocument();
		expect( screen.getByRole( 'gridcell', { name: /star/i } ) ).toBeInTheDocument();
		expect( screen.queryByRole( 'gridcell', { name: /github/i } ) ).not.toBeInTheDocument();
	} );

	it( 'supports keyboard navigation and restores focus when the filter menu closes', async () => {
		// Arrange.
		render(
			<ThemeProvider>
				<IconLibraryPopover
					open
					selectedIconClass={ null }
					selectedIconLibrary={ null }
					onSelect={ jest.fn() }
					onClose={ jest.fn() }
				/>
			</ThemeProvider>
		);

		const filterButton = screen.getByRole( 'button', { name: 'Filter by library' } );

		// Act.
		act( () => filterButton.focus() );
		fireEvent.click( filterButton );

		const menu = screen.getByRole( 'menu', { name: 'Filter by library' } );
		const allIconsOption = screen.getByRole( 'menuitemcheckbox', { name: 'All icons' } );

		// Assert.
		expect( filterButton ).toHaveAttribute( 'aria-expanded', 'true' );
		expect( allIconsOption ).toBeChecked();
		await waitFor( () => expect( allIconsOption ).toHaveFocus() );

		// Act.
		fireEvent.keyDown( menu, { key: 'ArrowDown' } );

		const regularOption = screen.getByRole( 'menuitemcheckbox', { name: 'Font Awesome - Regular' } );

		expect( regularOption ).toHaveFocus();

		fireEvent.keyDown( regularOption, { key: 'Enter' } );

		// Assert.
		expect( regularOption ).toBeChecked();

		// Act.
		fireEvent.keyDown( menu, { key: 'Escape' } );

		// Assert.
		expect( filterButton ).toHaveFocus();
		expect( filterButton ).toHaveAttribute( 'aria-expanded', 'false' );
	} );

	it( 'closes the filter menu when its trigger is clicked again', async () => {
		// Arrange.
		render(
			<ThemeProvider>
				<IconLibraryPopover
					open
					selectedIconClass={ null }
					selectedIconLibrary={ null }
					onSelect={ jest.fn() }
					onClose={ jest.fn() }
				/>
			</ThemeProvider>
		);

		const filterButton = screen.getByRole( 'button', { name: 'Filter by library' } );

		// Act.
		fireEvent.click( filterButton );
		fireEvent.click( filterButton );

		// Assert.
		await waitFor( () => {
			expect( screen.queryByRole( 'menu', { name: 'Filter by library' } ) ).not.toBeInTheDocument();
		} );
		expect( filterButton ).toHaveAttribute( 'aria-expanded', 'false' );
	} );

	it( 'filters by search and shows an empty state', () => {
		// Arrange.
		jest.useFakeTimers();

		render(
			<ThemeProvider>
				<IconLibraryPopover
					open
					selectedIconClass={ null }
					selectedIconLibrary={ null }
					onSelect={ jest.fn() }
					onClose={ jest.fn() }
				/>
			</ThemeProvider>
		);

		// Act.
		fireEvent.change( screen.getByPlaceholderText( 'Search' ), { target: { value: 'missing' } } );

		// Assert.
		expect( screen.getByRole( 'gridcell', { name: /star/i } ) ).toBeInTheDocument();

		act( () => {
			jest.advanceTimersByTime( ICON_LIBRARY_SEARCH_DEBOUNCE_DELAY );
		} );

		expect( screen.getByText( /Sorry, nothing matched/ ) ).toBeInTheDocument();
		expect( screen.getByText( /missing/ ) ).toBeInTheDocument();

		fireEvent.click( screen.getByRole( 'button', { name: 'Clear & try again' } ) );

		expect( screen.getByPlaceholderText( 'Search' ) ).toHaveValue( '' );
		expect( screen.getByRole( 'gridcell', { name: /star/i } ) ).toBeInTheDocument();
	} );

	it( 'shows a load failure when the catalog is empty', () => {
		// Arrange.
		jest.mocked( useFontAwesome7Catalog ).mockReturnValue( {
			data: [],
			isLoading: false,
		} as never );

		render(
			<ThemeProvider>
				<IconLibraryPopover
					open
					selectedIconClass={ null }
					selectedIconLibrary={ null }
					onSelect={ jest.fn() }
					onClose={ jest.fn() }
				/>
			</ThemeProvider>
		);

		// Assert.
		expect( screen.getByText( /Icons couldn't be loaded/ ) ).toBeInTheDocument();
	} );

	it( 'resets the library filter when closed', () => {
		// Arrange.
		const onClose = jest.fn();

		render(
			<ThemeProvider>
				<IconLibraryPopover
					open
					selectedIconClass={ null }
					selectedIconLibrary={ null }
					onSelect={ jest.fn() }
					onClose={ onClose }
				/>
			</ThemeProvider>
		);

		// Act.
		fireEvent.click( screen.getByRole( 'button', { name: 'Filter by library' } ) );
		fireEvent.click( screen.getByRole( 'menuitemcheckbox', { name: 'Font Awesome - Brands' } ) );
		fireEvent.keyDown( screen.getByRole( 'menu' ), { key: 'Escape' } );
		fireEvent.click( screen.getByRole( 'button', { name: 'close' } ) );

		// Assert.
		expect( onClose ).toHaveBeenCalledTimes( 1 );
		expect( screen.getByRole( 'button', { name: 'Filter by library' } ) ).toBeInTheDocument();

		fireEvent.click( screen.getByRole( 'button', { name: 'Filter by library' } ) );
		expect( screen.getByRole( 'menuitemcheckbox', { name: 'All icons' } ) ).toBeChecked();
	} );
} );
