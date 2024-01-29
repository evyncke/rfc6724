<html>
<!--
   Copyright 2024 Eric Vyncke, eric@vyncke.org

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
-->
<head>
<meta http-equiv="content-type" content="text/html; charset=utf-8"/>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Using latest bootstrap 5 -->
<!-- Latest compiled and minified CSS add media="screen" would reserve it only for screen and not printers -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<!-- Latest compiled JavaScript -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

<!-- Glyphicon equivalent -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">

<!--
Using code from https://github.com/whitequark/ipaddr.js
-->
<title>RFC 6724 on-line</title>
<script src="ipaddr.js"></script>
<script src="rfc6724.js"></script>
<!-- Matomo -->
<script type="text/javascript">
  var _paq = window._paq = window._paq || [];
  _paq.push(["setDocumentTitle", document.domain + "/" + document.title]);
  _paq.push(['enableHeartBeatTimer']);
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function() {
      var u="//analytics.vyncke.org/";
      _paq.push(['setTrackerUrl', u+'matomo.php']);
      _paq.push(['setSiteId', '1']);
      var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
      g.type='text/javascript'; g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
   })();
</script>
<!-- End Matomo Code -->
</head>
<body onload="init();">
<h1>RFC 6724 on-line</h1>

<div class="row">
<div class="col-xs-12 col-md-6">
<h2>Source addresses</h2>
Address#1: <input type="text" id="src1" onkeyup="addrChanged(this);" length="32">
<span id="span_src1"></span>
<br/>
Address#2: <input type="text" id="src2" onkeyup="addrChanged(this);" length="32">
<span id="span_src2"></span>
</div><!-- col -->

<div class="col-xs-12 col-md-6">
<h2>Destination address(es)</h2>
Address#1: <input type="text" id="dst1" onkeyup="addrChanged(this);" length="32">
<span id="span_dst1"></span>
<br/>
Address#2: <input type="text" id="dst2" onkeyup="addrChanged(this);" length="32">
<span id="span_dst2"></span>
</div><!-- col -->
<p>You need to input two valid source IPv6 addresses and at least one valid destination IPv6 address.
The address scope, label, and preference are automatically computed and displayed. As soon as
two source addresses and at least one destination address are validated, then the best
pair of source and destination is evaluated against RFC 6724.</p>
</div><!--row-->
<div class="row">
<div id="policy" class="col-md-6 w-auto"></div><!-- policy-->
</div><!-- row -->
<span id="sas"></span>
<span id="das"></span>
</body>
</html>
