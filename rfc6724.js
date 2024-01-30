/*
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
*/

// Policy class
class RFC6724policyRow {
	constructor(name, prefix, prefixLength, precedence, label) {
		this.name = name ;
		this.prefix = prefix ;
		this.prefixLength = prefixLength ;
		this.cidr = ipaddr.parseCIDR(prefix + '/' + prefixLength) ;
		this.precedence = precedence ;
		this.label = label ;
	}
}

class RFC6724policy {
	constructor(policyName) {
		this.rows = [] ;
    this.policyName = policyName ;
	}
	add(name, prefix, prefixLength, precedence, label) {
		this.rows.push(new RFC6724policyRow(name, prefix, prefixLength, precedence, label)) ;
	}
	getPolicy(a) {
		if (a.kind() == 'ipv4') // If IPv4 address, then let's make it IPv6
			a = a.toIPv4MappedAddress() ;
		let bestRow = -1, bestRowPrefixLength = -1 ;
		for (let i = 0 ; i < this.rows.length; i++)
			if (a.match(this.rows[i].cidr))
				if (this.rows[i].prefixLength > bestRowPrefixLength) {
					bestRowPrefixLength = this.rows[i].prefixLength ;
					bestRow = i ;
				}
		return this.rows[bestRow] ; // Assuming that there will be a matching row
	}
	getLabel(a) {
		let row = this.getPolicy(a) ;
		return row.label ;
	}
	getPrecedence(a) {
		let row = this.getPolicy(a) ;
		return row.precedence ;
	}
	toHTML() {
		let s = '<table class="table table-hover table-striped table-bordered caption-top">' +
			'<caption class="text-center">' + this.policyName + ' policy table</caption>' +
			'<thead><tr><th>Type</th><th>Prefix</th><th>Precedence</th><th>Label</th></tr></thead>' +
			'<tbody class="table-divider">' ;
		for (let i = 0 ; i < this.rows.length; i++)
				s += '<tr><td>' + this.rows[i].name + '</td><td>' + this.rows[i].cidr.toString() + 
					'</td><td>' + this.rows[i].precedence + '</td><td>' + this.rows[i].label + '</td></tr>' ;
		s += '</tbody></table>' ;
		return s ;
	}
}

var policy = new RFC6724policy() ;

// For scopes
var scopeName = ['link', 'site', 'global'] ;
const lla = ipaddr.parseCIDR('fe80::/10') ;
const ipv4lla = ipaddr.parseCIDR('169.254.0.0/16') ;
const ipv4loopback = ipaddr.parseCIDR('127.0.0.0/8') ;
const siteLocal = ipaddr.parseCIDR('fec0::/10') ;
const gua = ipaddr.parseCIDR('2000::/3') ;
const ula = ipaddr.parseCIDR('fc00::/7') ;
const mcast = ipaddr.parseCIDR('ff00::/8') ;

function getScope(a) {
	if (a.kind() == 'ipv4') { // See RFC 6724 section 3.2
		if (a.match(ipv4lla)) return 0 ; // Link scope
		if (a.match(ipv4loopback)) return 0 ; // Link scope
		return 2 ; // Else global
	}
	if (a.match(lla)) return 0 ; // Link-local scope is 0
	if (a.match(siteLocal)) return 1 ; // Site-local scope is 1
	if (a.match(gua)) return 2 ; // GUA is global scope
	if (a.match(ula)) return 2 ; // ULA is global scope
	if (a.match(mcast)) { // more tricky for multicast !!!
		let bytes = a.toByteArray() ;
		switch (bytes[1] % 16) {
		case 0x2: return 0 ; 
		case 0x5: return 1 ;
		case 0xe: return 2 ;
		default: return -1 ;
		}
	}
	return -1 ;
}

function scopeToString(a) {
	let scope = getScope(a) ;

	if (scope >= 0) return scopeName[scope] ;
	return 'unknown' ;
}

// Called when another set of example addresses set is selected
// Merely by loading a file
function addressesChanged(elem) {
	let n = elem.value ;
	fetch('example_' + n + '.json')
		.then((response) => response.json())
		.then((json) => changeAddresses(json)) ;
}

// CHange all the input boxes based on the addressesChanged call-back
function changeAddresses(json) {
	document.getElementById('src1').value = json.src1 ;
	document.getElementById('src2').value = json.src2 ;
	document.getElementById('dst1').value = json.dst1 ;
	if (typeof(json.dst2) == 'undefined')
		document.getElementById('dst2').value = '' ;
	else
		document.getElementById('dst2').value = json.dst2 ;
	selectAddress() ;
}

// Called when one input box has changed
function addrChanged(elem) {
	if (elem.value == '') return ;
	document.getElementById('sas').innerHTML = '' ;
	document.getElementById('das').innerHTML = '' ;
	let span = document.getElementById('span_' + elem.id) ;
	try {
		var a = ipaddr.parse(elem.value) ;
	} catch (err) {
		span.innerHTML = '<i class="bi bi-ban-fill text-danger"></i>' ;
		elem.style.borderColor = 'red' ;
		elem.style.color = 'red' ;
		return ;
	}
	elem.style.color = 'initial' ;
	elem.style.borderColor = 'initial' ;
	scope = getScope(a) ;
	span.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>Scope: ' + scopeName[scope] + ', precedence: ' + policy.getPrecedence(a) + ', label: ' + policy.getLabel(a);
	selectAddress() ;
}

function selectAddress() {
	// Let's recompute everything
	// Let's look at all src for all dst
	addressPairs = [] ;
	document.getElementById('sas').innerHTML = '<h2>Source address selection</h2>' ;
	runSourceRules('dst1') ;
	document.getElementById('sas').innerHTML += displaySources('dst1') ;
	runSourceRules('dst2') ;
	document.getElementById('sas').innerHTML += displaySources('dst2') ;
	// Check the best pair <src, dst>
	if (addressPairs.length == 1) {
		document.getElementById('das').innerHTML = '<h2>Destination address selection</h2>' +
			'There is only one selected pair of <source, destination> addresses, i.e., the selected source is ' +
			addressPairs[0].source.toString() + ' and the destination is ' +
			addressPairs[0].destination.toString() + '.' ;
	} else if (addressPairs.length > 0) {
		document.getElementById('das').innerHTML = '<h2>Destination address selection</h2>' +
			'There are ' + addressPairs.length + ' selected pair(s) of &lt;source, destination&gt; addresses:<ol>' ;
		for (var i = 0; i < addressPairs.length; i++) {
			document.getElementById('das').innerHTML += '<li> &lt;' +
				addressPairs[i].source.toString() + ', ' +
				addressPairs[i].destination.toString() + '&gt;</li>' ;
		}
		document.getElementById('das').innerHTML += '</ol>' ;	
		// Need to compare each pair to another pair and select the winner...
		// loop until only one pair is left in the array, comparing one entry to the next one
		// and keeping only one (the best or any if equivalent) by using .splice() method ?
		let detailsDiv = 0 ;
		while (addressPairs.length > 1) {
			if (compareDestination(addressPairs[0], addressPairs[1], detailsDiv++) < 0)
				addressPairs.splice(0, 1) ;
			else
				addressPairs.splice(1, 1) ;
		}
		document.getElementById('das').innerHTML += '<h2>Final selected addresses</h2>' +
			'<p>The best pair of &lt;source, destination&gt; is: &lt;' +
			addressPairs[0].source.toString() + ', ' + addressPairs[0].destination.toString() + '&gt;.</p>' ;
	} else {
		document.getElementById('das').innerHTML = '<p class="text-warning">Cannot select the source/destination addresses.</p>' ;
	}
	// Let's log the input addresses set 
	if (document.getElementById('dst2').value == '')
		console.log(JSON.stringify({src1: document.getElementById('src1').value, src2: document.getElementById('src2').value,
			dst1: document.getElementById('dst1').value})) ;
	else
		console.log(JSON.stringify({src1: document.getElementById('src1').value, src2: document.getElementById('src2').value,
			dst1: document.getElementById('dst1').value, dst2: document.getElementById('dst2').value})) ;
}

function runSourceRules(dstId) {
	let sasLog = document.getElementById('sas') ;
	let src1 = document.getElementById('src1').value, src2 = document.getElementById('src2').value,
		dst = document.getElementById(dstId).value ;
	if (src1 == '' || src2 == '' || dst == '') return ;
	if (!ipaddr.isValid(src1) || !ipaddr.isValid(src2) || !ipaddr.isValid(dst)) return ;
	sa = ipaddr.parse(src1) ;
	sb = ipaddr.parse(src2) ;
	d = ipaddr.parse(dst) ;
	sasLog.innerHTML += '<h3>Source address(es) selection for destination ' + d.toString() + 
		'<a data-bs-toggle="collapse" href="#collapse_' + dstId + '" aria-expanded="false" aria-controls="collapse_' + dstId + '">' +
		'<i class="bi bi-chevron-expand"></i></a></h3>' +
		'<div class="collapse" id="collapse_' + dstId + '"><div class="card card-body">' +
		'<span id="details_' + dstId + '"></span></div></div>' ;
	sasLog = document.getElementById('details_' + dstId) ;
	if (sa.kind() == d.kind() && sb.kind() != d.kind()) {
		sasLog.innerHTML += 'Only source ' + sa.toString() + ' has the same IP version as destination. This address is selected.' ;
		addressPairs.push({source: sa, destination: d}) ;
		return ;
	}
	if (sa.kind() != d.kind() && sb.kind() == d.kind()) {
		sasLog.innerHTML += 'Only source ' + sb.toString() + ' has the same IP version as destination. This address is selected.' ;
		addressPairs.push({source: sb, destination: d}) ;
		return ;
	}
	if (sa.kind() != d.kind() && sb.kind() != d.kind()) {
		sasLog.innerHTML += 'None of the source has the same IP version as destination. No address is selected.' ;
		return ;
	}
	sasLog.innerHTML += "<h4>Rule 1: Prefer same address</h4>" ;
	if (sa.toString() == d.toString()) {
		sasLog.innerHTML += 'Source#1 is the same as Destination#1 => Source#1 (' + sa.toString() + ') will be used.' ;
		addressPairs.push({source: sb, destination: d}) ;
		return ;
	}
	if (sb.toString() == d.toString()) {
		sasLog.innerHTML += 'Source#2 is the same as Destination#1 => Source#2 (' + bb.toString() + ') will be used.' ;
		addressPairs.push({source: sb, destination: d}) ;
		return ;
	}
	sasLog.innerHTML += 'None of the source addresses equals the destination address, continuing the RFC 6724 rules.' +
		'<h4>Rule 2: Prefer appropriate scope</h4>' ;
	if (getScope(sa) < 0) {
		sasLog.innerHTML += 'Cannot compute the scope of address: ' + sa.toString() + ' Aborting the evaluation' ;
		return ;
	}
	if (getScope(sb) < 0) {
		sasLog.innerHTML += 'Cannot compute the scope of address: ' + sb.toString() + ' Aborting the evaluation' ;
		return ;
	}
	if (getScope(d) < 0) {
		sasLog.innerHTML += 'Cannot compute the scope of address: ' + d.toString() + ' Aborting the evaluation' ;
		return ;
	}
	if (getScope(sa) < getScope(sb)) {
		sasLog.innerHTML += 'The ' + scopeToString(sa) + ' scope of Source#1 (' + sa.toString() + ')' +
			' is smaller than the ' + scopeToString(sb) + ' scope of Source#2 (' + sb.toString() + ')' ;
		if (getScope(sa) < getScope(d)) {
			sasLog.innerHTML += ' and is also smaller than the ' + scopeToString(d) +
				' scope of the ' + d.toString() + ' destination.<br/>' +
			       'The selection source address is Source#2: ' + sb.toString() ;
			addressPairs.push({source: sb, destination: d}) ;
			return ;
		} else {
			sasLog.innerHTML += ' but is not smaller than the ' + scopeToString(d) +
				' scope of the ' + d.toString() + ' destination.<br/>' +
			       'The selection source address is Source#1: ' + sa.toString() ;
			addressPairs.push({source: sa, destination: d}) ;
			return ;
		}
	}
	if (getScope(sb) < getScope(sa)) {
		sasLog.innerHTML += 'The ' + scopeToString(sb) + ' scope of Source#2 (' + sb.toString() + ')' +
			' is smaller than the ' + scopeToString(sa) + ' scope of Source#1 (' + sa.toString() + ')' ;
		if (getScope(sb) < getScope(d)) {
			sasLog.innerHTML += ' and is also smaller than the ' + scopeToString(d) +
				' scope of the ' + d.toString() + ' destination.<br/>' +
			       'The selection source address is Source#1: ' + sa.toString() ;
			addressPairs.push({source: sa, destination: d}) ;
			return ;
		} else {
			sasLog.innerHTML += ' but is not smaller than the ' + scopeToString(d) +
				' scope of the ' + d.toString() + ' destination.<br/>' +
			       'The selection source address is Source#2: ' + sb.toString() ;
			addressPairs.push({source: sb, destination: d}) ;
			return ;
		}
	}
	sasLog.innerHTML += 'The scopes of both source addresses are equal (' + scopeToString(sa) + '), continuing with next rules.' +
		'<h4>Rule 3: Avoid deprecated addresses</h4>' +
		'No information about address deprecation, this rule is not evaluated.' +
		'<h4>Rule 4: Prefer home addresses</h4>' +
		'No information about home or care-of addresses, this rule is not evaluated.' +
		'<h4>Rule 5: Prefer outgoing interface</h4>' +
		'No information about per addresses per interface or outgoing interface, this rule is not evaluated.' +
		'<h5>Rule 5.5: Prefer addresses in a prefix advertised by the next-hop</h5>' +
		'No information about prefix and next-hop, this rule is not evaluated.' +
		'<h4>Rule 6: Prefer matching label</h4>' ;
	let labelA = policy.getLabel(sa) ;
	let labelB = policy.getLabel(sb) ;
	let labelD = policy.getLabel(d) ;
	sasLog.innerHTML += 'Source#1 label is : ' + labelA + '.<br/>' ;
	sasLog.innerHTML += 'Source#2 label is : ' + labelB + '.<br/>' ;
	sasLog.innerHTML += 'Destination#1 label is : ' + labelD + '.<br/>' ;
	if (labelA == labelD && labelB != labelD) {
		sasLog.innerHTML += 'Only Source#1 has the same label as the destination, Source#1 ' + sa.toString() + ' is selected.' ;
		addressPairs.push({source: sa, destination: d}) ;
		return ;
	} ;
	if (labelB == labelD && labelA != labelD) {
		sasLog.innerHTML += 'Only Source#2 has the same label as the destination, Source#2 ' + sb.toString() + ' is selected.' ;
		addressPairs.push({source: sb, destination: d}) ;
		return ;
	} ;
	sasLog.innerHTML += 'As the two sources have the same label, continuing with the next rules.' +
		'<h4>Rule 7: Prefer temporary addresses</h4>' +
		'No information about whether addresses are temporary, this rule is not evaluated.' +
		'<h4>Rule 8: Use longest matching prefix</h4>' ;
	let commonPrefixA = sa.commonPrefixLength(d) ;
	let commonPrefixB = sb.commonPrefixLength(d) ;
	sasLog.innerHTML += 'Prefix match(' + sa.toString() + ', ' + d.toString() + ') = ' + commonPrefixA + '<br/>' ;
	sasLog.innerHTML += 'Prefix match(' + sb.toString() + ', ' + d.toString() + ') = ' + commonPrefixB + '<br/>' ;
	if (commonPrefixA > commonPrefixB) {
		sasLog.innerHTML += 'Source#1 (' + sa.toString() + ') has more leading bits in common with destination(' + d.toString() + '), using Source#1 as the source address.' ;
		addressPairs.push({source: sa, destination: d}) ;
	} else if (commonPrefixB > commonPrefixA) {
		sasLog.innerHTML += 'Source#2 (' + sb.toString() + ') has more leading bits in common with destination(' + d.toString() + '), using Source#2 as the source address.' ;
		addressPairs.push({source: sb, destination: d}) ;
	} else {
		sasLog.innerHTML += 'As both source addresses have the same longuest match, the algorithm ends with a tie, i.e., any source address can be used.' ;
		addressPairs.push({source: sa, destination: d}) ;
		addressPairs.push({source: sb, destination: d}) ;
	}
}

// generate HTML with the selected address(es) for destination
function displaySources(dstId) {
	let dst = document.getElementById(dstId).value ;
	if (dst == '') return '';
	let d =ipaddr.parse(dst) ;
	let s = '<p class="text-info">The selected source address(es) for destination ' + d.toString() + ' is/are: ' ;
	for (let i = 0 ; i < addressPairs.length ; i++) {
		if (addressPairs[i].destination.toString() == d.toString())
			s += addressPairs[i].source.toString() + ' ' ;
	}
	s += '.</p>' ;
	return s ;

}

// Compare two sets of <src, dst> addresses, return +1 if a should be preferred, 0 if a is the same as b, else -1
function compareDestination(a, b, detailsDivId) {
	let dasLog = document.getElementById('das') ;
	dasLog.innerHTML += '<h3>Comparing &lt;' + a.source.toString() + ', ' + a.destination.toString() + '&gt; with ' +
		'&lt;' + b.source.toString() + ', ' + b.destination.toString() + '&gt;' +
		'<a data-bs-toggle="collapse" href="#collapse_' + detailsDivId + '" aria-expanded="false" aria-controls="collapse_' + detailsDivId + '">' +
		'<i class="bi bi-chevron-expand"></i></a></h3>' +
		'<div class="collapse" id="collapse_' + detailsDivId + '"><div class="card card-body">' +
		'<span id="details_' + detailsDivId + '"></span></div></div>' ;
		'</h3>' ;
	dasLog = document.getElementById('details_' + detailsDivId) ;
	dasLog.innerHTML = '<h4>Rule 1: Avoid unusable destinations</h4>' +
		'Assuming that all destinations are reachable, ignoring this rule.' +
		'<h4>Rule 2: Prefer matching scope</h4>' ;
	let scopeSA = getScope(a.source) ;
	let scopeDA = getScope(a.destination) ;
	let scopeSB = getScope(b.source) ;
	let scopeDB = getScope(b.destination) ;
	dasLog.innerHTML += '<p>First pair scopes are &lt;' + scopeToString(a.source) + ', ' + scopeToString(a.destination) + '&gt; while the second pair ones are &lt' +
			 scopeToString(b.source) + ', ' + scopeToString(b.destination) + '&gt;.</p>' ;
	if (scopeSA == scopeDA && scopeSB != scopeDB) {
		dasLog.innerHTML += '<p>The first pair has matching scope while the second one does not, preferring the first pair.</p>' ;
		return +1 ;
	}
	if (scopeSA != scopeDA && scopeSB == scopeDB) {
		dasLog.innerHTML += '<p>The second pair has matching scope while the first one does not, preferring the second pair.</p>' ;
		return -1 ;
	}
	dasLog.innerHTML += '<p>Both pairs have matching scopes for source and destination. Continuing to the next rule.</p>' +
		'<h4>Rule 3: Avoid deprecated addresses</h4>' +
		'<p>No information about whether addresses are deprecated, ignoring this rule and evaluation of the next rule.</p>' +
		'<h4>Rule 4: Prefer home addresses</h4>' +
		'<p>No information about home / care-of addresses, ignoring this rule, evaluation continues to the next rule.</p>' +
		'<h4>Rule 5: Prefer matching label</h4>' ;
	let labelSA = policy.getLabel(a.source) ;
	let labelDA = policy.getLabel(a.destination) ;
	let labelSB = policy.getLabel(b.source) ;
	let labelDB = policy.getLabel(b.destination) ;
	dasLog.innerHTML += '<p>Labels are &lt;' + labelSA + ', ' + labelDA + '&gt; and &lt;' + labelSB + ', ' + labelDB + '&gt.</p>' ;
	if (labelSA == labelDA && labelSB != labelDB) {
		dasLog.innerHTML += '<p>The first pair has matching labels while the second one does not, preferring the first pair.</p>' ;
		return +1 ;
	}
	if (labelSA != labelDA && labelSB == labelDB) {
		dasLog.innerHTML += '<p>The second pair has matching labels while the first one does not, preferring the second pair.</p>' ;
		return -1 ;
	}
	dasLog.innerHTML += '<p>Both pairs have matching labels, continuing with next rule.</p>' +
		'<h4>Rule 6: Prefer higher precedence</h4>' ;
	let precedenceDA = policy.getPrecedence(a.destination) ;
	let precedenceDB = policy.getPrecedence(b.destination) ;
	if (precedenceDA > precedenceDB) {
		dasLog.innerHTML += '<p>Precedence of ' + a.destination.toString() + '(' + precedenceDA + ') is greater than the precedence of ' +
			b.destination.toString() + '(' + precedenceDB + '), therefore ' + a.destination.toString() + ' is selected.</p>' ;
		return 1 ;
	}
	if (precedenceDA < precedenceDB) {
		dasLog.innerHTML += '<p>Precedence of ' + a.destination.toString() + '(' + precedenceDA + ') is less than the precedence of ' +
			b.destination.toString() + '(' + precedenceDB + '), therefore ' + b.destination.toString() + ' is selected.</p>' ;
		return -1 ;
	}
	dasLog.innerHTML += '<p>Both have the same precedence (' + precedenceDA + '), continuing with the next rule.</p>' +
		'<h4>Rule 7: Prefer native transport</h4>' +
		'<p>Some encapsulation mechanisms do not have reserved prefix, hence this page cannot apply this rule, continuing to the next rule.</p>' +
		'<h4>Rule 8: Prefer smaller scope</h4>' ;
	scopeDA = getScope(a.destination) ;
	scopeDB = getScope(b.destination) ;
	if (scopeDA < scopeDB) {
		dasLog.innerHTML += '<p>The scope of the first destination address (' + scopeDA + ') is less than the scope of the second address (' + scopeDB + '), ' +
			'then the first address, ' + a.destination.toString() + ', is preferred.</p>' ;
		return +1 ;
	}
	if (scopeDA > scopeDB) {
		dasLog.innerHTML += '<p>The scope of the second destination address (' + scopeDB + ') is less than the scope of the first address (' + scopeDA + '), ' +
			'then the second address, ' + b.destination.toString() + ', is preferred.</p>' ;
		return -1 ;
	}
	// TODO display scope names rather than numbers
	dasLog.innerHTML += '<p>The scopes of both destination addresses are identical (' + scopeDA + '), continuing to next rule.</p>' +
		'<h4>Rule 9: Use longest matching prefix</h4>' ;
	return 1 ;
}

function changePolicy(json) {
  policy = new RFC6724policy(json.policyName) ;
  for (let i = 0; i < json.rows.length ; i++)
    policy.add(json.rows[i].name, json.rows[i].prefix, json.rows[i].prefixLength, json.rows[i].precedence, json.rows[i].label) ;
	document.getElementById('policy').innerHTML = policy.toHTML() ;
}

function loadPolicy(name) {
	fetch('policy_' + name + '.json')
		.then((response) => response.json())
		.then((json) => changePolicy(json)) ;
}

function init() {
	// Fill in the policy
  loadPolicy('rfc6724') ;
	document.getElementById('policy').innerHTML = policy.toHTML() ;
}
