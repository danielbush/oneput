import { element, registerIcon } from '@oneput/oneput';
import * as lu from 'lucide';

export const iconData = {
  X: lu.X,
  Settings: lu.Settings,
  Keyboard: lu.Keyboard,
  ChevronRight: lu.ChevronRight,
  Check: lu.Check,
  SquareFunction: lu.SquareFunction,
  ArrowLeft: lu.ArrowLeft,
  Sigma: lu.Sigma,
  TableOfContents: lu.TableOfContents, // tocIcon
  ChevronUp: lu.ChevronUp,
  ChevronDown: lu.ChevronDown,
  Command: lu.Command,
  Search: lu.Search,
  ListFilter: lu.ListFilter,
  RefreshCw: lu.RefreshCw,
  CircleAlert: lu.CircleAlert,
  Globe: lu.Globe,
  Timer: lu.Timer,
  Play: lu.Play,
  Stop: lu.Square,
  Pause: lu.Pause,
  CircleX: lu.CircleX,
  Section: lu.Section,
  History: lu.History,
  CalendarCheck: lu.CalendarCheck,
  Pencil: lu.Pencil,
  Plus: lu.Plus,
  Info: lu.Info,
  Square: lu.Square,
  Circle: lu.Circle,
  Dot: lu.Dot,
  NotebookPen: lu.NotebookPen,
  Tag: lu.Tag,
  Clock: lu.Clock,
  ChevronsLeftRightEllipsis: lu.ChevronsLeftRightEllipsis,
  // Bindings we should provide for existing appObjects...
  GlobalFilterInputIcon: lu.Globe,
  CloseNotification: lu.X
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
