<?php
mb_internal_encoding("utf8");

$l = file($argv[1]);
$m = file($argv[2]);

for ($i=1;$i<count($m);$i++) 
	$m[$i]=explode(",",trim($m[$i]));

for ($i=1;$i<count($l);$i++) {
	$l[$i]=explode(",",trim($l[$i]));
	$l[$i][0]=substr($l[$i][0],2,2).substr($l[$i][0],5,2).substr($l[$i][0],8);
	for ($j=1;$j<count($m);$j++)
	if ($m[$j][1]==$l[$i][1]) {
		$l[$i][1]=$m[$j][0];
		break;
	}
	$l[$i]=implode(",",array_slice($l[$i],0,27));
}
$l[0]="date,entityid,01,02,03,05,10,18,20,30,40,50,60,70,80,88,89,90,91,92,93,94,95,96,97,98,99";
echo implode("\n",$l);

?>
