<script lang="ts">
	import VisualDebugControls from '$lib/demo/components/VisualDebugControls.svelte';
	import ForceDarkModeControls from '$lib/demo/components/ForceDarkMode.svelte';

	/**
	 * Taken from https://www.devtoolsdaily.com/blog/random-text-javascript/ .
	 */
	function generateRandomText(numParagraphs: number, numSentencesPerParagraph: number) {
		const words = [
			'lorem',
			'ipsum',
			'dolor',
			'sit',
			'amet',
			'consectetur',
			'adipiscing',
			'elit',
			'sed',
			'do',
			'eiusmod',
			'tempor',
			'incididunt',
			'ut',
			'labore',
			'et',
			'dolore',
			'magna',
			'aliqua'
		];
		const paragraphs = [];
		for (let p = 0; p < numParagraphs; p++) {
			const sentences = [];
			for (let i = 0; i < numSentencesPerParagraph; i++) {
				const numWords = Math.floor(Math.random() * 10) + 5;
				const sentenceWords = [];
				for (let j = 0; j < numWords; j++) {
					const randomIndex = Math.floor(Math.random() * words.length);
					sentenceWords.push(words[randomIndex]);
				}
				const sentence = sentenceWords.join(' ') + '.';
				sentences.push(sentence.charAt(0).toUpperCase() + sentence.slice(1));
			}
			paragraphs.push(sentences.join(' '));
		}
		return paragraphs.join('\n\n');
	}
</script>

<main>
	<h1>Oneput Demo</h1>
	<VisualDebugControls />
	<ForceDarkModeControls />
	<p>
		Here we pretend we are an app that oneput is managing. The command bar is now anchored to the
		bottom of the screen and will stay visible while this content scrolls.
	</p>

	<br />

	<h2>&sect; 1</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h2>&sect; 2</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h3>&sect; 2.1</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h2>&sect; 3</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h3>&sect; 3.1</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h3>&sect; 3.2</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h4>&sect; 3.2.1</h4>
	<p>{generateRandomText(1, 5)}</p>
	<h2>&sect; 4</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h3>&sect; 4.1</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h3>&sect; 4.2</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h3>&sect; 4.3</h3>
	<p>{generateRandomText(1, 5)}</p>
	<h2>&sect; 5</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h2>&sect; 6</h2>
	<p>{generateRandomText(1, 5)}</p>
	<h2>&sect; 7</h2>
	<p>{generateRandomText(1, 5)}</p>
</main>

<style>
	h1,
	h2,
	h3,
	h4 {
		margin: 1rem 0;
	}
	main {
		padding-bottom: 1rem;
	}
</style>
