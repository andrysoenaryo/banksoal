import * as FiIcons from 'react-icons/fi';

export const FEATHER_ICON_NAMES = Object.keys(FiIcons)
    .filter((iconName) => iconName.startsWith('Fi'))
    .sort((left, right) => left.localeCompare(right));

export function resolveFeatherIcon(iconName) {
    if (!iconName) {
        return null;
    }

    return FiIcons[iconName] ?? null;
}