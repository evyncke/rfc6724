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

// For scopes
var scopeName = ['link', 'site', 'global'] ;
const lla = ipaddr.parseCIDR('fe80::/10') ;
const gua = ipaddr.parseCIDR('2000::/3') ;
const ula = ipaddr.parseCIDR('fc00::/7') ;
const mcast = ipaddr.parseCIDR('ff00::/8') ;

// For labels & preference
const loopback = ipaddr.parseCIDR('::1/128'),
	allv6 = ipaddr.parseCIDR('::/0'),
	v4mapped = ipaddr.parseCIDR('::ffff:0:0/96'),
	six2four = ipaddr.parseCIDR('2002::/16'),
	teredo = ipaddr.parseCIDR('2001::/32'),
	v4compatible = ipaddr.parseCIDR('::/96'),
	siteLocal = ipaddr.parseCIDR('fec0::/10'), // deprecated
	sixbone = ipaddr.parseCIDR('3ffe::/16'); // even if returned

function getScope(a) {
	if (a.match(lla)) return 0 ; // Link-local scope is 0
	if (a.match(siteLocal)) return 0 ; // Site-local scope is 1
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

function getLabel(a) {
	// Try table entries, starting with the longuest prefix
	if (a.match(loopback)) return 0 ;
	if (a.match(v4mapped)) return 4 ;
	if (a.match(v4compatible)) return 3 ;
	if (a.match(teredo)) return 5 ;
	if (a.match(six2four)) return 2 ;
	if (a.match(sixbone)) return 12 ;
	if (a.match(siteLocal)) return 11 ;
	if (a.match(ula)) return 13 ;
	return 1 ; // No need to match to ::/0 ;-)
}

function getPrecedence(a) {
	// Try table entries, starting with the longuest prefix
	if (a.match(loopback)) return 50 ;
	if (a.match(v4mapped)) return 35 ;
	if (a.match(v4compatible)) return 1 ;
	if (a.match(teredo)) return 5 ;
	if (a.match(six2four)) return 30 ;
	if (a.match(sixbone)) return 1 ;
	if (a.match(siteLocal)) return 1 ;
	if (a.match(ula)) return 3 ;
	return 40 ; // No need to match to ::/0 ;-)
}

function addrChanged(elem) {
	if (elem.value == '') return ;
	let span = document.getElementById('span_' + elem.id) ;
	try {
		var a = ipaddr.parse(elem.value) ;
	} catch (err) {
		span.innerHTML = '<span style="color: red;">invalid</span>' ;
		elem.style.borderColor = 'red' ;
		elem.style.color = 'red' ;
		return ;
	}
	if (a.kind() != 'ipv6') {
		span.innerHTML = '<span style="color: red;">Not an IPv6 address</span>' ;
		elem.style.borderColor = 'red' ;
		elem.style.color = 'red' ;
		return ;
	}
	elem.style.color = 'initial' ;
	elem.style.borderColor = 'initial' ;
	scope = getScope(a) ;
	span.innerHTML = "scope: " + scopeName[scope] ;
	// Let's recompute everything
	// Let's look at all src for all dst
	addressPairs = [] ;
	runSourceRules('dst1') ;
	runSourceRules('dst2') ;
	// Check the best pair <src, dst>
	if (addressPairs.length == 0) {
		document.getElementById('das').innerHTML = '<h2>Destination address selection</h2>' +
			'There is only one pair of <source, destination> addresses, i.e., the selected source is ' +
			addressPairs[0].source.toString() + ' and the destination is ' +
			addressPairs[0].destination.toString() + '.' ;
	} else if (addressPairs.length > 0) {
		document.getElementById('das').innerHTML = '<h2>Destination address selection</h2>' +
			'There are ' + addressPairs.length + ' pair(s) of &lt;source, destination&gt; addresses:<ol>' ;
		for (var i = 0; i < addressPairs.length; i++) {
			document.getElementById('das').innerHTML += '<li> &lt;' +
				addressPairs[i].source.toString() + ', ' +
				addressPairs[i].destination.toString() + '&gt;</li>' ;
		}
		document.getElementById('das').innerHTML += '</ol>' ;	
		// Need to compare each pair to another pair and select the winner...
		// loop until only one pair is left in the array, comparing one entry to the next one
		// and keeping only one (the best or any if equivalent) by using .splice() method ?
		while (addressPairs.length > 1) {
			if (compareDestination(addressPairs[0], addressPairs[1]) < 0)
				addressPairs.splice(0, 1) ;
			else
				addressPairs.splice(1, 1) ;
		}
		document.getElementById('das').innerHTML += '<h2>Final addresses</h2>' +
			'<p>The best pair of &lt;source, destination&gt; is: &lt;' +
			addressPairs[0].source.toString() + ', ' + addressPairs[0].destination.toString() + '&gt;.</p>' ;
	} else {
		document.getElementById('das').innerHTML = '' ;
	}
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
	if (sa.kind() != 'ipv6' || sb.kind() != 'ipv6' || d.kind() != 'ipv6') return ;
	sasLog.innerHTML += "<h2>Source address(es) selection for destination " + d.toString() + "</h2>" ;
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
	let labelA = getLabel(sa) ;
	let labelB = getLabel(sb) ;
	let labelD = getLabel(d) ;
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

// Compare two sets of <src, dst> addresses, return +1 if a should be preferred, 0 if a is the same as b, else -1
function compareDestination(a, b) {
	let dasLog = document.getElementById('das') ;
	dasLog.innerHTML += '<h3>Comparing &lt;' + a.source.toString() + ', ' + a.destination.toString() + '&gt; with ' +
		'&lt;' + b.source.toString() + ', ' + b.destination.toString() + '&gt;</h3>' +
		'<h4>Rule 1: Avoid unusable destinations</h4>' +
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
	let labelSA = getLabel(a.source) ;
	let labelDA = getLabel(a.destination) ;
	let labelSB = getLabel(b.source) ;
	let labelDB = getLabel(b.destination) ;
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
	let precedenceDA = getPrecedence(a.destination) ;
	let precedenceDB = getPrecedence(b.destination) ;
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
	dasLog.innerHTML += '<p>Both have the same precedence (' + precedenceDA + '), continuing with the next rule.</p>' ;
	return 1 ;
}

function init() {
	// Some tests
	document.getElementById('src1').value = '2001:db8::1' ;
	document.getElementById('src2').value = 'fe80::1' ;
	document.getElementById('dst1').value = 'ff02::1' ;
	document.getElementById('dst2').value = 'ff05::1' ;
	// Two globals but with different labels
	document.getElementById('src1').value = '2002:c633:6401::d5e3:7953:13eb:22e8' ;
	document.getElementById('src2').value = '2001:db8:1::2' ;
	document.getElementById('dst1').value = '2002:c633:6401::1' ;
	// Two globals but with different length of prefix matching
	document.getElementById('src1').value = '2001:db8:cafe:babe::1' ;
	document.getElementById('src2').value = '2001:db8:dead:beef::1' ;
	document.getElementById('dst1').value = '2001:db8:c0ca:babe::2' ;
	// Two globals but with different length of prefix matching and two dest
	document.getElementById('src1').value = '2001:db8:cafe:babe::1' ;
	document.getElementById('src2').value = '2001:db8:dead:beef::1' ;
	document.getElementById('dst1').value = '2001:db8:c0ca:babe::2' ;
	// Two globals but with different length of prefix matching and two dest including ULA
	document.getElementById('src1').value = '2001:db8:cafe:babe::1' ;
	document.getElementById('src2').value = 'fd00:dead:beef::1' ;
	document.getElementById('dst1').value = '2001:db8:c0ca:babe::2' ;
	document.getElementById('dst2').value = 'fc00:dead:c0ca:babe::2' ;
}
