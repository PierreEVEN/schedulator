#!/bin/sh

wget -O /opt/schedulator/schedulator.zip https://github.com/PierreEVEN/schedulator/releases/latest/download/schedulator_linux.zip
unzip /opt/schedulator/schedulator.zip -d /opt/schedulator
rm /opt/schedulator/schedulator.zip
mv /opt/schedulator/schedulator/schedulator /opt/schedulator/schedulator_exe
rmdir /opt/schedulator/schedulator/
chmod u+x /opt/schedulator/schedulator_exe
/opt/schedulator/schedulator_exe