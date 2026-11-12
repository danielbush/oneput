import { element, registerIcons } from '@oneput/oneput';
import * as lu from 'lucide';

export const iconData = {
  X: lu.X,
  Flag: lu.Flag,
  Settings: lu.Settings,
  Keyboard: lu.Keyboard,
  ChevronRight: lu.ChevronRight,
  ChevronLeft: lu.ChevronLeft,
  ChevronsLeft: lu.ChevronsLeft,
  ChevronsRight: lu.ChevronsRight,
  Check: lu.Check,
  ArrowUp: lu.ArrowUp,
  SendHorizontal: lu.SendHorizontal,
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
  Folder: lu.Folder,
  File: lu.File,
  // Bindings we should provide for existing appObjects...
  CloseNotification: lu.X
};

export const icons = registerIcons(iconData, (icon) => element(() => lu.createElement(icon)));
