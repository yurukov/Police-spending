<?php
mb_internal_encoding("utf8");

$l = file($argv[1]);
$cols = false;
$pos = false;
$data=array();

$l[0] = mb_substr(mb_strstr(rtrim($l[0])," - "),3);
$header = array(mb_substr($l[0],0,10));
if (strlen(substr($l[0],10))==0)
	exit;
mb_ereg_search_init(substr($l[0],10));
while ($m = mb_ereg_search_regs("\d\d ....","msr"))
	$header[]=substr(trim($m[0]),0,2);
$header[]="sum";

for ($i=1;$i<count($l);$i++) {
	$l[$i]=rtrim($l[$i]);
	mb_ereg_search_init($l[$i]);
	$d = array("");
	$offset=0;
	$m = mb_ereg_search_regs(".{10} - .*?(?=  +-?\d)","msr");
	if ($m) {
		$offset = strlen($m[0]) - mb_strlen($m[0]);
		$d[0]=str_replace(",","",$m[0]);
	}
	mb_ereg_search_setpos(0);

	while ($m = mb_ereg_search_pos("-?\d+( \d{3})*[\.,]\d\d","msr")) {
		$n = doubleval(str_replace(",",".",str_replace(" ","",substr($l[$i],$m[0],$m[1]))));
		$d[]=array($n,$m[0]-$offset,$m[1]);
	}
	if ($i==1)
		$cols=count($d);
	else if (!$pos && count($d)==$cols)
		$pos = $d;
	$data[]=$d;
}

$emptyd = array();
for ($j=0;$j<$cols;$j++)
	$emptyd[$j]=0;
$sums=$emptyd;

for ($i=0;$i<count($data);$i++) {
	$d=$emptyd;
	if ($i>0)
		$d[0]=$data[$i][0];
	if (count($data[$i])!=$cols)
		for ($j=1,$k=1;$j<count($data[$i]) && $k<$cols;$k++) {
			$center = $data[$i][$j][1]+$data[$i][$j][2]/2;
			if ($center<=$pos[$k][1]+$pos[$k][2]+2) {
				$d[$k]=$data[$i][$j][0];
				$j++;
			}
		}
	else {
		for ($j=1;$j<count($data[$i]);$j++)
			$d[$j]=$data[$i][$j][0];
	}
	if ($i>0)
		for ($j=1;$j<count($d);$j++)
			$sums[$j]+=$d[$j];
	$data[$i]=$d;
//	print_r($data[$i]);
}

if (isset($argv[2])) {
	if ($argv[2]=="1") {
		print_r($data[0]);
		print_r($sums);
	}
} else if (array_diff($data[0],$sums) || array_diff($sums,$data[0]))
	die("error ".$argv[1]);

$fullh=array($header[0],'01','02','03','05','10','18','20','30','40','50','60','70','80','88','89','90','91','92','93','94','95','96','97','98','99', 'sum');
$shift=array(0,0);
for ($i=1,$j=1;$i<count($fullh);$i++) {
	if ($fullh[$i]==$header[$j]) {
		$shift[]=0;
		$j++;
	} else {
		$shift[$j]++;
	}
}
$data[0]=implode(",",$fullh);
for ($i=1;$i<count($data);$i++) {
	$d=array();
	for ($j=0;$j<count($data[$i]);$j++) {
		for ($k=0;$k<$shift[$j];$k++)
			$d[]='';
		$d[]=$data[$i][$j]==0?'':$data[$i][$j];	
	}
	$data[$i]=implode(",",$d);
}
echo implode("\n",$data);


?>
