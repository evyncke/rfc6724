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
<!-- TODO create a HTML link to the set of addresses + policy -->
<?php
$policy = (isset($_REQUEST['policy']) and $_REQUEST['policy'] != '') ? basename($_REQUEST['policy']) : 'rfc6724' ;
$src1 = (isset($_REQUEST['src1'])) ? trim($_REQUEST['src1']) : '' ;
$src2 = (isset($_REQUEST['src2'])) ? trim($_REQUEST['src2']) : '' ;
$dst1 = (isset($_REQUEST['dst1'])) ? trim($_REQUEST['dst1']) : '' ;
$dst2 = (isset($_REQUEST['dst2'])) ? trim($_REQUEST['dst2']) : '' ;
?>
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
      _paq.push(['setSiteId', '7']);
      var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
      g.type='text/javascript'; g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
   })();
</script>
<!-- End Matomo Code -->
</head>
<body onload="init('<?=$policy?>');">
<div class="container">

<div class="row">
<p class="text-end">Link:
<a id="pageURL" href="<?=$_SERVER['PHP_SELF']?>" title="share the address set + policy choice"><i class="bi bi-link-45deg"></i></a>
<i class="bi bi-copy link-primary" onclick="navigator.clipboard.writeText(document.getElementById('pageURL').href)" title="Copy the link"></i></p>
</div><!--row-->

<h1 class="display-1">RFC 6724 on-line</h1>

<p><small>You need to input two valid source IPv4/IPv6 addresses and at least one valid destination IPv4/IPv6 address.
The address scope, label, and preference are automatically computed and displayed. As soon as
two source addresses and at least one destination address are validated, then the best
pair of source and destination is evaluated against
<select id="policySelect" onchange="loadPolicy(this.value);" class="form-select-sm">
<option value="rfc6724">RFC 6724</option>
<option value="rfc3484">RFC 3484</option>
<option value="linux-5.15">linux-5.15 (2024)</option>
<option value="rfc6724-bis">draft-ietf-6man-rfc6724-update-06</option>
</select>. Click on <i class="bi bi-chevron-expand text-primary"></i> to expand the rule evaluation.</small></p>

<div class="row">
<h2>Addresses</h2>
<p><small>Please enter the IPv4/IPv6 addresses below or select an example set of addresses from RFC 6724 sections 10.1 and 10.2:
<select id="setId" onchange="addressesChanged(this);" name="addressesSet" class="form-select w-auto">
<option disabled>Preload address examples from RFC 6724</option>
<option value="1">1 - Source: prefer appropriate scope</option>
<option value="2">2 - Source: prefer appropriate scope</option>
<option value="3">3 - Source: prefer same address</option>
<option value="4">4 - Source: prefer appropriate scope</option>
<option value="5">5 - Source: longest matching prefix</option>
<option value="7">7 - Source: prefer matching label</option>
<option value="9">9 - Destination: prefer matching scope</option>
<option value="10">10 - Destination: prefer matching scope</option>
<option value="11">11 - Destination: prefer higher precedence</option>
<option value="12">12 - Destination: prefer smaller scope</option>
<option value="15">15 - Destination: longest matching prefix</option>
<option value="16">16 - Destination: prefer matching label</option>
<option value="17">17 - Destination: prefer higher precedence</option>
<option disabled>-- About draft-ietf-6man-rfc6724-update --</option>
<option value="98">98 - draft-ietf-6man-rfc6724-update: ULA-ULA preferred over IPv4-IPv4</option>
<option value="99">99 - draft-ietf-6man-rfc6724-update: IPv4-IPv4 preferred over ULA-GUA</option>
</select>
</p>
</div><!-- row -->

<div class="row">
<div class="col-xs-12 col-md-6">
<h3>Source</h3>
Address#1: <input type="text" id="src1" onkeyup="addrChanged(this);" length="32" placeholder="2001:db8::1" value="<?=$src1?>">
<span id="span_src1"></span>
<br/>
Address#2: <input type="text" id="src2" onkeyup="addrChanged(this);" length="32" placeholder="Any IPv4/IPv6 address" value="<?=$src2?>">
<span id="span_src2"></span>
</div><!-- col -->

<div class="col-xs-12 col-md-6">
<h3>Destination</h3>
Address#1: <input type="text" id="dst1" onkeyup="addrChanged(this);" length="32" placeholder="2001:db8:2::1" value="<?=$dst1?>">
<span id="span_dst1"></span>
<br/>
Address#2: <input type="text" id="dst2" onkeyup="addrChanged(this);" length="32" placeholder="Can be empty" value="<?=$dst2?>">
<span id="span_dst2"></span>
</div><!-- col -->
</div><!--row-->

<hr>
<div class="row">
<div id="policy" class="col-md-6 w-auto"></div><!-- policy-->
</div><!-- row -->

<hr>

<span id="sas"></span>
<span id="das"></span>
</div><!-- container-->
</body>
</html>
