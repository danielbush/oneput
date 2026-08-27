import { element, registerIcons } from '@oneput/oneput';
import * as lu from 'lucide';

export const iconData = {
  ChevronDown: lu.ChevronDown,
  ArrowLeft: lu.ArrowLeft,
  ArrowRight: lu.ArrowRight,
  X: lu.X,
  Check: lu.Check,
  ArrowUp: lu.ArrowUp,
  SendHorizontal: lu.SendHorizontal,
  Command: lu.Command,
  File: lu.Files,
  CloseNotification: lu.X,
  Pencil: lu.Pencil,
  Anchor: lu.Anchor,
  Space: lu.Space,
  Tags: lu.Tags,
  Plus: lu.Plus,
  CodeXml: lu.CodeXml,
  SquareCode: lu.SquareCode,
  Scissors: lu.Scissors,
  Copy: lu.Copy,
  CircleX: lu.CircleX,
  ArrowLeftToLine: lu.ArrowLeftToLine,
  ArrowRightToLine: lu.ArrowRightToLine,
  ArrowDownToLine: lu.ArrowDownToLine,
  BetweenHorizonalStart: lu.BetweenHorizonalStart,
  PencilOff: lu.PencilOff,
  Undo2: lu.Undo2,
  Redo2: lu.Redo2
};

export const icons = registerIcons(iconData, (icon) => element(() => lu.createElement(icon)));
