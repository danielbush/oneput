<script lang="ts">
  import '$lib/jsed/styles/test-doc.css';
</script>

<div id="test-doc" style="max-width: 900px; margin: 0 auto;">
  <h1 class="jsed-ignore">Demo</h1>
  <p class="jsed-ignore">
    Welcome to the jsed demo! This is keyboard-centric demo that takes you through how to use the
    keybindings. There will be a separate demo for touch screens and mobile devices.
  </p>
  <p class="jsed-ignore notice">
    <b>Warning:</b> jsed is in <b>pre-alpha</b> so it's not ready to be used and significant features
    are missing or need improving.
  </p>
  <h2 class="jsed-ignore">Navigation</h2>
  <p class="jsed-ignore">
    Let's start. The colored regions of this document (including this paragraph) are not editable.
  </p>
  <p class="jsed-ignore notice">
    <b>NOTE:</b> <b>$mod</b> = <b>Meta key</b> (macOS) or <b>Control key</b> (linux/windows)
  </p>
  <ul class="jsed-ignore">
    <li>Hit <b>$mod+b</b> to open the menu at the bottom of the screen</li>
    <li>Select <b>Start editing...</b></li>
    <li>
      You should see a blue rectangle outline around the whole document. This is called the <b
        >FOCUS</b
      >.
    </li>
    <li>Now you can play with the navigation keys:</li>
    <li><b>$mod+L / Right Arrow</b> moves the FOCUS <b>"in"</b> to some part of the document</li>
    <li><b>$mod+H / Left Arrow</b> moves the FOCUS back <b>"out"</b></li>
    <li>
      <b>$mod+J / Down Arrow</b> moves the FOCUS to the next sibling structure in the document
    </li>
    <li>
      <b>$mod+K / Up Arrow</b> moves the FOCUS to the previous sibling structure in the document
    </li>
  </ul>
  <p>
    Hit <b>$mod+L</b> and see if you can get the focus to sit on this p-tag. If you keep hitting it,
    it may sit on the b-tag (bolded text) within this paragraph. Hit <b>$mod+H</b> to go back out to the
    paragraph.
  </p>
  <p>
    Once you're focused on the paragraph above, try hitting <b>$mod+J</b> to move the FOCUS down to
    this. Then hit <b>$mod+K</b> to move the FOCUS back up to it.
  </p>
  <p>
    Here's a bit more practice. Below are some bullet points including some nested entries. Trying
    moving in an out and between the items using all 4 keys. (Hint: use $mod+J to move down to the
    list and $mod+L to go "into" it.)
  </p>
  <ul>
    <li>this is the first bullet point</li>
    <li>this is the second bullet point</li>
    <li>
      <p>
        this is the third bullet point is in a paragraph tag. Below it are nested bullet points.
      </p>
      <ul>
        <li>nested item one</li>
        <li>nested item two</li>
        <li>nested item three</li>
        <li>nested item four</li>
      </ul>
    </li>
    <li>this is the fourth bullet point</li>
  </ul>

  <h2 class="jsed-ignore">Editing</h2>
  <ul class="jsed-ignore">
    <li>
      Use the motion keys to move the FOCUS so that it sits on the paragraph below. Then hit <b
        >ENTER</b
      > (or whatever pass for your usual return key).
    </li>
    <li>
      You should see the first word highlighted: <b>"Try"</b>. And you should see <b>"Try"</b>
      appear in the input box at the bottom of the page and it should be selected. The easiest way to
      edit is to just type over the word. Try typing <b>"Stop"</b>. It should replace "Try".
    </li>
    <li>
      Now move the cursor over to <b>"paragraph."</b> at the end of the sentence. To do this hit
      <b>$mod+L</b>. You should see the cursor moving through each word. Note how the "cursor" here
      is the whole word. (<b>$mod+H</b> moves you back again, go on, give it a try.)
    </li>
    <li>
      With your cursor over the word <b>"paragraph."</b> hit <b>$mod+E</b> once. You should see a
      small mark appear to the right of <b>"paragraph."</b> We'll refer to this as
      <b>append mode</b>. The input box below should no longer be in a "select all" state, instead
      the "input cursor" (not to be confused with the highlighed "cursor" on the paragraph) should
      be at the end. Now delete the fullstop (by hitting backspace on your keyboard) and type
      <b>"!"</b>.
    </li>
  </ul>
  <p>Try editing this paragraph.</p>
  <ul class="jsed-ignore">
    <li>
      Now hit <b>$mod+E</b> 3 times in a row. You should see:
      <ol>
        <li>the text <b>"paragraph!"</b> get selected again, just like when we first hit ENTER</li>
        <li>then we go into <b>append mode</b> like before like above</li>
        <li>
          ...and finally on the 3rd hit the mark now moves to the beggining of <b>"paragraph!"</b>
          and the cursor in the input at the bottom of the page is now also at the beginning of
          <b>"pararaph!".</b>. You guessed it, we'll call this <b>prepend mode</b>.
        </li>
      </ol>
    </li>
    <li>
      We could type something at this point which would add letters to the beginning of <b
        >"paragraph!"</b
      >
      which wouldn't be terribly edifying.
    </li>
    <li>
      Instead hit <b>SPACE</b>. Note how the "input cursor" in the input at the bottom of the screen
      stays at the beginning position but now there is a space before <b>"paragraph!"</b>.
    </li>
    <li>
      Then type <b>"amazing"</b>. Hopefully the sentence should now read:
      <b>"Stop editing this amazing paragraph!"</b> -- because that makes total sense. But it does illustrate
      that we can replace words, we can edit words very quickly from either side and we can insert words
      before the current word without too much effort.
    </li>
    <li>Now move your cursor so it's over <b>"amazing"</b></li>
    <li>
      Hit <b>$mod+E</b> to go into <b>append mode</b> but this time hit <b>SPACE</b>
    </li>
    <li>
      then type <b>"and spectacular"</b>. Notice how input clears on each space as you type a new
      word.
    </li>
    <li>
      Hopefully your sentence should now read: <b
        >Stop editing this amazing and spectacular paragraph!</b
      > - and while this is making dramatically less sense with each iteration, you have just learned
      how to type new content!
    </li>
  </ul>

  <p>To get out of edit mode you can hit <b>ESCAPE</b></p>

  <br />
  <br />
  <br />
  <br />
  <br />
</div>
