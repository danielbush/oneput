<script lang="ts">
  import '$lib/jsed/styles/test-doc.css';
</script>

<div id="test-doc">
  <h1 class="jsed-ignore">Default behaviours</h1>
  <h2 class="jsed-ignore">Simple paragraphs</h2>
  <p>This is just a simple paragraph of text. And this is a second sentence.</p>
  <p>Here's a second paragraph with more text in it.</p>
  <p>Here's a third paragraph with more text in it.</p>

  <h2 class="jsed-ignore">Bulleted lists</h2>
  <ul>
    <li>no para</li>
    <li>
      <p>1st para</p>
      <p>2nd para - try: split parent before this p-tag</p>
    </li>
    <li>
      <p>1st para</p>
      2nd implied para
    </li>
  </ul>

  <h2 class="jsed-ignore">INLINE_FLOW</h2>
  <div>before em <em>within em</em> after em</div>
  <div>before em tags <em>em 1</em> <em>em 2</em> after em tags</div>
  <div>
    before
    <em>em-tag with a <b>nested b-tag</b> back in the em-tag</em> and now we're out again
  </div>

  <h2 class="jsed-ignore">IMPLICIT_LINE's and mixed levels</h2>
  <div>
    aa bb
    <div>
      cc dd <div>
        ee ff <div>gg hh</div>
        ii jj
      </div>
      kk ll
    </div>
    mm nn
    <div>oo pp</div>
    qq rr
  </div>
  <div>
    aa bb <p>cc dd</p>
    ee ff
  </div>
  <div>
    aa bb
    <p>cc dd</p>
    <p>ee ff</p>
    gg hh
    <p>ii jj</p>
    <p>kk ll</p>
  </div>
  <div>
    aa bb
    <div>cc dd</div>
    ee ff
  </div>
  <hr class="jsed-ignore" />
  <div>
    <p>aa bb</p>
    cc dd
  </div>
  <div>
    <p>aa bb</p>
    cc<strong>dd <em>ee</em></strong> ff gg
    <br />
    hh ii
    <hr />
    jj kk
    <br />
  </div>
  <hr class="jsed-ignore" />
  <p class="jsed-ignore">br tags are inline by default</p>
  <div>
    aa bb <br /> cc dd
  </div>
  <hr class="jsed-ignore" />
  <div>&nbsp;<em></em>&nbsp;</div>

  <p class="jsed-ignore">inline-block</p>
  <div>
    aa bb
    <span style="border: 1px dashed red; padding: 2px; display: inline-block">cc dd</span>
    ee ff
  </div>

  <div>
    aa bb
    <div style="border: 1px dashed red; display: inline-block">
      <p>cc dd</p>
      <p>ee ff</p>
    </div>
    gg hh
  </div>

  <div>
    <span style="border: 1px dashed red; padding: 2px; display: inline-block">aa bb</span>
    cc dd
  </div>
  <div>
    aa bb
    <span style="border: 1px dashed red; padding: 2px; display: inline-block">cc dd</span>
  </div>

  <p class="jsed-ignore">ISLAND's</p>
  <div><span class="katex" style="display: inline">x²</span> aa bb</div>
  <div>cc dd <span class="katex" style="display: inline">x²</span> ee ff</div>
  <p class="jsed-ignore">inline ISLAND</p>
  <div>
    <p>aa bb <span class="katex" style="display: inline">x²</span> cc dd</p>
  </div>
  <p class="jsed-ignore">block ISLAND</p>
  <div>
    <p>aa bb</p>
    <span class="katex" style="display: block">x²</span>
    <p>cc dd</p>
  </div>
  <p class="jsed-ignore">ISLAND (katex) block in p-tag (not really valid but could happen)</p>
  <div>
    <p>
      aa bb
      <span class="katex" style="display: block">x²</span>
      cc dd
    </p>
  </div>

  <p class="jsed-ignore">Floats</p>
  <div>
    aa bb
    <img
      src="missing.jpg"
      alt="placeholder"
      style="float: right; width: 100px; height: 100px; border: 1px dashed red"
    />
    cc dd
  </div>
  <hr class="jsed-ignore" style="clear:both;" />
  <div>
    aa bb
    <figure style="margin: 0; float: right; border: solid black 1px">
      <img
        src="missing.jpg"
        alt="placeholder"
        style="width: 100px; height: 100px; border: dotted black 1px; display: block"
      />
      <figcaption>cc dd</figcaption>
    </figure>
    ee ff
  </div>
  <hr class="jsed-ignore" style="clear:both;" />
  <div>
    <p>aa bb</p>
    <figure style="margin: 0; float: right; border: solid black 1px">
      <img
        src="missing.jpg"
        alt="placeholder"
        style="width: 100px; height: 100px; border: dotted black 1px; display: block"
      />
      <figcaption>cc dd</figcaption>
    </figure>
    <p>ee ff</p>
  </div>
  <p class="jsed-ignore">Embedded ignores</p>
  <div>
    aa bb
    <div class="jsed-ignore">this is ignored</div>
    cc dd
  </div>

  <h1 class="jsed-ignore">ANCHOR's, TRAILING_SPACE, LEADING_SPACE</h1>
  <p class="jsed-ignore">
    Try adding/remove LEADING_SPACE's and TRAILING_SPACE's. Try adding and removing ANCHOR's.
  </p>

  <p style="border: 1px dashed red; min-height: 1rem; position: relative">
    <span style="position: absolute; right: 0; top: 0; margin: 0" class="note jsed-ignore"
      >(empty p-tag)</span
    >
  </p>
  <p><em>aa</em><strong>bb</strong></p>
  <p><em>aa</em>bb<strong>cc</strong></p>
  <p><em>aa</em> <strong>bb</strong></p>
  <p>aa<em>bb</em>cc</p>
  <p><u>aa</u><strong>bb</strong>cc</p>
  <p><em>aa</em> <strong>bb</strong> <u>cc</u></p>
  <p><em>aa</em><strong>bb</strong><u>cc</u></p>
  <div>
    aa <em>bb<strong>cc</strong></em>
    <span class="katex" style="display: inline">x²</span>dd ee
  </div>

  <h2 class="jsed-ignore">Scrollable container</h2>
  <div style="height: 150px; overflow-y: scroll; border: 1px solid #ccc; padding: 10px">
    <p>First paragraph inside the scrollable container.</p>
    <p>Second paragraph with some more text to take up space.</p>
    <p>Third paragraph continuing to add content.</p>
    <p>Fourth paragraph to ensure we have enough overflow.</p>
    <p>Fifth paragraph adding more scrollable content.</p>
    <p>Sixth paragraph near the bottom of the container.</p>
    <p>Seventh paragraph to guarantee scrolling is needed.</p>
  </div>

  <h2 class="jsed-ignore">SHALLOW_TOKENIZATION</h2>
  <p class="jsed-ignore">
    The following div contains mulltiple paragraph tags. If this div represents a large document we
    would hit performance issues if we tokenized it all.
  </p>
  <div>
    <p>line 1</p>
    <p>line 2 with <em>emphasis</em> tag</p>
    <p>line 3</p>
    <p>line 4</p>
  </div>

  <h1 class="jsed-ignore" style="clear: right">(deprecated) TRANSPARENT_BLOCK</h1>
  <div>
    <span class="jsed-cursor-transparent" style="border: 1px dashed red; display: inline-block"
      >transparent inline-block</span
    >
    after transparent inline-block
  </div>
  <div>
    Before the block...
    <div class="jsed-cursor-transparent" style="border: 1px dashed red">
      this div is marked as jsed-cursor-transparent
    </div>
    After the block.
  </div>
  <div>
    Before the inline-block...
    <div class="jsed-cursor-transparent" style="border: 1px dashed red; display: inline-block">
      this div is marked as jsed-cursor-transparent
    </div>
    After the inline-block.
  </div>

  <div style="height: 400px"></div>
</div>

<style>
  :global(.jsed-token) {
    outline: 0.5px solid rgba(0, 0, 0, 0.4);
  }
</style>
