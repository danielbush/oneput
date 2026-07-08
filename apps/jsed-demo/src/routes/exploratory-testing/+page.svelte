<script lang="ts">
  import '$lib/jsed/styles/test-doc.css';
</script>

<div id="test-doc">
  <h1 data-jsed-focus="off">Default behaviours</h1>
  <h2 data-jsed-focus="off">Simple paragraphs and INLINE_FLOW</h2>
  <p>aaa</p>
  <p>aaa bbb</p>
  <p>aaa bbb ccc</p>
  <p>aaa <em>bbb</em> ccc</p>
  <p>aaa bbb <em>ccc <strong>ddd eee</strong> fff</em> eee fff</p>
  <p>aaa bbb <em>ccc ddd</em> eee fff</p>
  <p>aaa bbb <em>ccc <strong>ddd</strong></em> eee fff</p>
  <p>aaa bbb <em>em1</em> <em>em2</em> ccc ddd</p>
  <p><em>aaa <strong>bbb</strong> ccc</em> ddd eee</p>
  <p><em><strong>aaa</strong></em> bbb ccc</p>
  <p><em><strong>aaa</strong><strong>bbb</strong></em></p>
  <p><em><strong></strong><strong></strong></em></p>

  <h2 data-jsed-focus="off">Bulleted lists</h2>
  <ul>
    <li>no para</li>
    <li>aaa bbb <em>ccc ddd</em> eee fff</li>
    <li>aaa bbb <em>ccc <strong>ddd</strong></em> eee fff</li>
    <li>
      <p>1st para</p>
      <p>2nd para - try: split parent before this p-tag</p>
    </li>
    <li>
      <p>1st para</p>
      2nd implied para
    </li>
  </ul>

  <h2 data-jsed-focus="off">IMPLICIT_LINE's and mixed levels</h2>
  <div>
    aa bb
    <div>
      cc dd <div>
        ee ff <div>gg hh</div>
        ii jj
        <div>
          <div>ii2 jj2</div>
          ii3 jj3
          <div>ii4 jj4</div>
        </div>
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
  <hr data-jsed-focus="off" />
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
  <hr data-jsed-focus="off" />
  <p data-jsed-focus="off">br tags are inline by default</p>
  <div>
    aa bb <br /> cc dd
  </div>
  <hr data-jsed-focus="off" />
  <div>&nbsp;<em></em>&nbsp;</div>

  <p data-jsed-focus="off">inline-block</p>
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

  <p data-jsed-focus="off">ISLAND's</p>
  <div><span class="katex" style="display: inline">x²</span> aa bb</div>
  <div>cc dd <span class="katex" style="display: inline">x²</span> ee ff</div>
  <p data-jsed-focus="off">inline ISLAND</p>
  <div>
    <p>aa bb <span class="katex" style="display: inline">x²</span> cc dd</p>
  </div>
  <p data-jsed-focus="off">block ISLAND</p>
  <div>
    <p>aa bb</p>
    <span class="katex" style="display: block">x²</span>
    <p>cc dd</p>
  </div>
  <p data-jsed-focus="off">ISLAND (katex) block in p-tag (not really valid but could happen)</p>
  <div>
    <p>
      aa bb
      <span class="katex" style="display: block">x²</span>
      cc dd
    </p>
  </div>

  <p data-jsed-focus="off">Floats</p>
  <div>
    aa bb
    <img
      src="missing.jpg"
      alt="placeholder"
      style="float: right; width: 100px; height: 100px; border: 1px dashed red"
    />
    cc dd
  </div>
  <hr data-jsed-focus="off" style="clear:both;" />
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
  <hr data-jsed-focus="off" style="clear:both;" />
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
  <p data-jsed-focus="off">Embedded ignores</p>
  <div>
    aa bb
    <div data-jsed-focus="off">this is ignored</div>
    cc dd
  </div>

  <h1 data-jsed-focus="off">ANCHOR's, TRAILING_SPACE, LEADING_SPACE</h1>
  <p data-jsed-focus="off">
    Try adding/remove LEADING_SPACE's and TRAILING_SPACE's. Try adding and removing ANCHOR's.
  </p>

  <p style="border: 1px dashed red; min-height: 1rem; position: relative">
    <span style="position: absolute; right: 0; top: 0; margin: 0" class="note" data-jsed-focus="off"
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
  <p data-jsed-focus="off">inline-block</p>
  <div>
    aa bb
    <div style="display:inline-block;">cc dd</div>
    ee ff
  </div>
  <div>
    <p>can we add ANCHOR before or after this p-tag?</p>
  </div>
  <div>
    <em>can we add ANCHOR before or after this em-tag?</em>
  </div>

  <h2 data-jsed-focus="off">Scrollable container</h2>
  <div style="height: 150px; overflow-y: scroll; border: 1px solid #ccc; padding: 10px">
    <p>First paragraph inside the scrollable container.</p>
    <p>Second paragraph with some more text to take up space.</p>
    <p>Third paragraph continuing to add content.</p>
    <p>Fourth paragraph to ensure we have enough overflow.</p>
    <p>Fifth paragraph adding more scrollable content.</p>
    <p>Sixth paragraph near the bottom of the container.</p>
    <p>Seventh paragraph to guarantee scrolling is needed.</p>
  </div>

  <h2 data-jsed-focus="off">SHALLOW_TOKENIZATION</h2>
  <p data-jsed-focus="off">
    The following div contains mulltiple paragraph tags. If this div represents a large document we
    would hit performance issues if we tokenized it all.
  </p>
  <div>
    <p>line 1</p>
    <p>line 2 with <em>emphasis</em> tag</p>
    <p>line 3</p>
    <p>line 4</p>
  </div>

  <h2 data-jsed-focus="off">FOCUS_TRANSPARENT</h2>
  <div style="background-color: #ddd; padding: 10px;">
    <p>Start here:</p>
    <div data-jsed-focus="off" style="padding: 10px; border: solid 1px black;">
      <p>the parent div is FOCUS_TRANSPARENT_SIBLING.</p>
      <p data-jsed-focus="on">But this one should be.</p>
      <div style="padding: 10px; border: solid 1px black;">
        <p>not reachable</p>
        <p data-jsed-focus="on">And this one should be.</p>
        <div data-jsed-focus="off" style="padding: 10px; border: solid 1px black;">
          <p>not reachable</p>
          <p data-jsed-focus="on">And this one inside a nested "off".</p>
        </div>
      </div>
    </div>
    <p>End here</p>
  </div>

  <div style="height: 400px"></div>
</div>

<style>
  :global(.jsed-token) {
    outline: 0.5px solid rgba(0, 0, 0, 0.4);
  }
</style>
