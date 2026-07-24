import { element, registerIcon } from '@oneput/oneput';
import * as lu from 'lucide';

export const iconData = {
  ChevronDown: lu.ChevronDown,
  ArrowLeft: lu.ArrowLeft,
  ArrowRight: lu.ArrowRight,
  X: lu.X,
  Check: lu.Check,
  Command: lu.Command,
  File: lu.Files,
  GlobalFilterInputIcon: lu.Globe,
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

Object.entries(iconData).forEach(([name, icon]) => {
  registerIcon(
    name,
    element(() => lu.createElement(icon))
  );
});

/**
 * Create a lookup that returns the name of the icon.
 */
export const icons = Object.fromEntries(
  Object.keys(iconData).map((name) => [name, name])
) as Record<keyof typeof iconData, string>;
