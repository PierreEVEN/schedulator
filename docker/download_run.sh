#!/bin/sh

VERSION=${1:-latest}

# Download and extract desired schedulator version
wget -O /opt/schedulator/schedulator.zip https://github.com/PierreEVEN/schedulator/releases/$VERSION/download/schedulator_linux.zip
unzip /opt/schedulator/schedulator.zip -d /opt/schedulator

# Install
mv /opt/schedulator/schedulator/schedulator /opt/schedulator/schedulator_exe
chmod u+x /opt/schedulator/schedulator_exe

# Cleanup
rm /opt/schedulator/schedulator.zip
rmdir /opt/schedulator/schedulator/

# Run
sleep 1000
/opt/schedulator/schedulator_exe