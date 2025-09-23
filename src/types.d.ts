// Module declarations for dependencies without types
declare module '@iktakahiro/markdown-it-katex' {
	import type MarkdownIt from 'markdown-it';

	function markdownItKatex(): MarkdownIt.PluginSimple;
	export = markdownItKatex;
}
