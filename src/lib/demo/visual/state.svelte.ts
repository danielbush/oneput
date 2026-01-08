import * as lu from 'lucide';
import { element, registerIcon } from '$lib/oneput/lib/icons.js';

const iconData = {
  ChevronUp: lu.ChevronUp,
  ChevronDown: lu.ChevronDown,
  Search: lu.Search,
  CircleSmall: lu.CircleSmall,
  ChevronRight: lu.ChevronRight,
  ChevronLeft: lu.ChevronLeft,
  Database: lu.Database,
  GitCommitVertical: lu.GitCommitVertical,
  Share2: lu.Share2,
  X: lu.X,
  Zap: lu.Zap,
  EllipsisVertical: lu.EllipsisVertical,
  Ellipsis: lu.Ellipsis,
  Mic: lu.Mic,
  Maximize2: lu.Maximize2,
  Info: lu.Info,
  Play: lu.Play,
  Pause: lu.Pause,
  Square: lu.Square
};

Object.entries(iconData).forEach(([name, icon]) => {
  registerIcon(
    name,
    element(() => lu.createElement(icon))
  );
});

export const icons = Object.fromEntries(
  Object.keys(iconData).map((name) => [name, name])
) as Record<keyof typeof iconData, string>;
