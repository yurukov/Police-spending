#!/bin/sh

echo "--Loading police budget--"

echo "Checking folders..."
if [ ! -s "../lists" ]; then mkdir ../lists; fi;
if [ ! -s "../reports" ]; then mkdir ../reports; fi;
if [ ! -s "../txt" ]; then mkdir ../txt; fi;
if [ ! -s "../csv" ]; then mkdir ../csv; fi;
if [ ! -s "../csvi" ]; then mkdir ../csvi; fi;

echo "Loading pages..."
for i in `cat list`; 
  do wget -q -O "../lists/"$i".html" "http://www.mvr.bg/Planirane_otchetnost/Budjet_fin_otchetnost/SEBRA/20$i.htm"; 
done
for i in `cat list`; 
  do grep "/NR/rdonlyres/" "../lists/$i.html" | sed 's_.*href="__;s_".*__'; 
done > list1

echo "Loading reports..."
for i in `cat list1`; 
  do b=`echo $i|sed 's_.*/__;s_\.pdf__'`;
  if [ ! -s "../reports/$b.pdf" ]
    then wget -q -O "../reports/$b.pdf" "http://www.mvr.bg$i"
    pdftotext -layout -nopgbrk "../reports/$b.pdf" "../txt/$b.txt"
    php parse.php "../txt/$b.txt" > "../csv/$b.csv"
  fi;
done

echo "Checking for errors...";
grep error ../csv/*

echo "Inverting reports..."
grep " - " ../csv/* | sed 's_.*csv:__;s_,.*__' | sort -nu > names
grep " - " ../csv/* | sed 's_.*csv:__;s_ -.*__;s_\*_\\*_g' | sort -nu > codes

for i in `cat codes`; 
  do n=`grep "$i" names`; 
  echo -n "$n" > "../csvi/$n.csv"; 
  head -1 ../csv/20120801.csv | sed 's_.\{10\}__' >>"../csvi/$n.csv"; 
  grep "$i" ../csv/* | sed 's_\.\./csv/__;s_\.csv:[^,]*__;s_\(....\)\(..\)\(..\)_\1-\2-\3_' >> "../csvi/$n.csv";
done
echo -n "Всички" > "../csvi/Всички.csv"; 
head -1 ../csv/20120801.csv | sed 's_.\{10\}_,Дирекция_' >> "../csvi/Всички.csv"; 
grep " - " ../csv/* | sed 's_\.\./csv/__;s_\.csv:_,_;s_\(....\)\(..\)\(..\)_\1-\2-\3_' >> "../csvi/Всички.csv"

echo "Archiving..."
zip -qru ../mvr_csv.zip ../csv ../csvi

echo "Done"
