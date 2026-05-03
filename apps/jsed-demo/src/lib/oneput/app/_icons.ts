import { element, registerIcon } from '@oneput/oneput';
import * as lu from 'lucide';

export const iconData = {
  ChevronDown: lu.ChevronDown,
  ArrowLeft: lu.ArrowLeft,
  ArrowRight: lu.ArrowRight,
  X: lu.X,
  Command: lu.Command,
  File: lu.Files,
  // Bindings we should provide for existing appObjects...
  GlobalFilterInputIcon: lu.Globe,
  CloseNotification: lu.X,
  Pencil: lu.Pencil,
  Anchor: lu.Anchor,
  Space: lu.Space,
  Tags: lu.Tags,
  Plus: lu.Plus,
  CodeXml: lu.CodeXml,
  SquareCode: lu.SquareCode
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
