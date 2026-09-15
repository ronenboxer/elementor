import * as React from 'react';
import { useId } from 'react';
import { CheckIcon, ListIcon, WidgetsIcon } from '@elementor/icons';
import {
	bindMenu,
	bindToggle,
	Menu,
	MenuItem,
	Stack,
	ToggleButton,
	Tooltip,
	Typography,
	usePopupState,
} from '@elementor/ui';
import { __ } from '@wordpress/i18n';

export type IconLibraryView = 'grid' | 'list';

type IconLibraryViewToggleProps = {
	value: IconLibraryView;
	onChange: ( value: IconLibraryView ) => void;
};

const VIEW_MENU_WIDTH = 122;
const VIEW_OPTIONS = [
	{ value: 'list', getLabel: () => __( 'List', 'elementor' ), Icon: ListIcon },
	{ value: 'grid', getLabel: () => __( 'Grid', 'elementor' ), Icon: WidgetsIcon },
] satisfies Array< {
	value: IconLibraryView;
	getLabel: () => string;
	Icon: typeof ListIcon;
} >;

export const IconLibraryViewToggle = ( { value, onChange }: IconLibraryViewToggleProps ) => {
	const popupState = usePopupState( {
		variant: 'popover',
		popupId: useId(),
	} );
	const CurrentViewIcon = value === 'grid' ? WidgetsIcon : ListIcon;

	const handleChange = ( nextView: IconLibraryView ) => {
		onChange( nextView );
		popupState.close();
	};

	return (
		<>
			<Tooltip title={ __( 'Change view', 'elementor' ) } placement="top" enterDelay={ 0 }>
				<ToggleButton
					aria-label={ __( 'Change view', 'elementor' ) }
					aria-expanded={ popupState.isOpen }
					value="view"
					size="tiny"
					selected={ popupState.isOpen }
					{ ...bindToggle( popupState ) }
				>
					<CurrentViewIcon fontSize="tiny" />
				</ToggleButton>
			</Tooltip>
			<Menu
				{ ...bindMenu( popupState ) }
				MenuListProps={ {
					dense: true,
					autoFocusItem: true,
					'aria-label': __( 'Icon library view', 'elementor' ),
				} }
				sx={ { '& .MuiPaper-root': { minWidth: VIEW_MENU_WIDTH } } }
			>
				{ VIEW_OPTIONS.map( ( { value: optionValue, getLabel, Icon } ) => {
					const isSelected = value === optionValue;

					return (
						<MenuItem
							key={ optionValue }
							role="menuitemradio"
							aria-checked={ isSelected }
							selected={ isSelected }
							onClick={ () => handleChange( optionValue ) }
						>
							<Stack direction="row" alignItems="center" gap={ 1 } width="100%">
								<Icon fontSize="tiny" />
								<Typography variant="caption" sx={ { flex: 1 } }>
									{ getLabel() }
								</Typography>
								{ isSelected ? <CheckIcon fontSize="tiny" /> : null }
							</Stack>
						</MenuItem>
					);
				} ) }
			</Menu>
		</>
	);
};
